import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SocialAPIClient, prepareCredentials } from "../_shared/social-api-client.ts";
import {
  authenticateRequest,
  ensureOrganizationRole,
  supabaseAdmin,
} from "../_shared/auth.ts";

interface PlatformOptimization {
  content?: string;
  hashtags?: string[];
  mentions?: string[];
  timing?: string;
  [key: string]: unknown;
}

interface ContentItem {
  id: string;
  title: string;
  content: string;
  organization_id: string | null;
  scheduled_platforms?: string[];
  platforms?: string[];
  platform_optimizations?: Record<string, PlatformOptimization>;
  media_urls?: string[];
  link?: string;
}

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  metrics?: Record<string, string | number | boolean>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateRequest(req, corsHeaders);
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const { organizationId }: { organizationId?: string } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hasRole = await ensureOrganizationRole(user.id, organizationId, ["owner", "admin"]);
    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to publish content." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date();

    // Rate limiting per organization
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentRuns } = await supabaseAdmin
      .from("publication_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("trigger_source", "manual")
      .gte("created_at", windowStart);

    if ((recentRuns ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
      return new Response(
        JSON.stringify({ error: "Publishing throttled. Please wait before retrying." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: contentToPublish, error: fetchError } = await supabaseAdmin
      .from("generated_content")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_scheduled", true)
      .eq("publication_status", "scheduled")
      .lte("scheduled_date", now.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch content: ${fetchError.message}`);
    }

    if (!contentToPublish || contentToPublish.length === 0) {
      return new Response(JSON.stringify({ message: "No content ready for publishing", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let successfulPublications = 0;
    let failedPublications = 0;

    for (const content of contentToPublish as ContentItem[]) {
      await supabaseAdmin
        .from("generated_content")
        .update({ publication_status: "publishing" })
        .eq("id", content.id);

      const platforms = content.scheduled_platforms || content.platforms || [];

      for (const platform of platforms) {
        try {
          const publishResult = await publishToPlatform(platform, content, organizationId);

          const logPayload = {
            content_id: content.id,
            platform,
            published_at: publishResult.success ? new Date().toISOString() : null,
            platform_post_id: publishResult.postId ?? null,
            error_message: publishResult.error ?? null,
            metrics: publishResult.metrics ?? {},
            organization_id: organizationId,
            trigger_source: "manual",
            status: publishResult.success ? "success" : "failed",
          };

          await supabaseAdmin.from("publication_logs").insert(logPayload);

          if (!publishResult.success) {
            failedPublications++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          await supabaseAdmin.from("publication_logs").insert({
            content_id: content.id,
            platform,
            status: "failed",
            error_message: errorMessage,
            metrics: {},
            organization_id: organizationId,
            trigger_source: "manual",
          });
          failedPublications++;
        }
      }

      const { data: logs } = await supabaseAdmin
        .from("publication_logs")
        .select("status")
        .eq("content_id", content.id)
        .eq("organization_id", organizationId);

      const allSuccessful = logs?.every((log) => log.status === "success");
      const hasFailures = logs?.some((log) => log.status === "failed");

      const finalStatus = allSuccessful ? "published" : hasFailures ? "failed" : "publishing";

      await supabaseAdmin
        .from("generated_content")
        .update({ publication_status: finalStatus })
        .eq("id", content.id);

      if (allSuccessful) {
        successfulPublications++;
      }
    }

    const response = {
      message: "Content publishing completed",
      processed: contentToPublish.length,
      successful: successfulPublications,
      failed: failedPublications,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in publish-scheduled-content function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage, details: "Failed to publish scheduled content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function publishToPlatform(platform: string, content: ContentItem, organizationId: string): Promise<PublishResult> {
  console.log(`Publishing to ${platform} for content ${content.id}`);

  const { data: settingsData, error: settingsError } = await supabaseAdmin
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", `${platform}_integration`)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(`${platform} integration not found: ${settingsError.message}`);
  }

  if (!settingsData?.setting_value?.connected) {
    throw new Error(`${platform} integration not configured or not connected`);
  }

  const credentials = settingsData.setting_value.credentials ?? {};
  const optimizedContent = content.platform_optimizations?.[platform] || {};
  const postContent = (optimizedContent.content as string | undefined) || content.content;
  const preparedCredentials = prepareCredentials(credentials, platform);
  const apiClient = new SocialAPIClient(preparedCredentials);
  const mediaUrls = content.media_urls || [];

  switch (platform.toLowerCase()) {
    case "facebook":
      return await apiClient.publishToFacebook(postContent, mediaUrls);
    case "instagram": {
      const instagramMediaUrl = mediaUrls[0] || "https://via.placeholder.com/1080x1080.png?text=OCMA+Post";
      return await apiClient.publishToInstagram(postContent, instagramMediaUrl);
    }
    case "twitter":
      return await apiClient.publishToTwitter(postContent, mediaUrls);
    case "linkedin":
      return await apiClient.publishToLinkedIn(postContent, mediaUrls);
    case "youtube":
      return await apiClient.publishToYouTube(postContent);
    case "tiktok":
      return await apiClient.publishToTikTok(postContent, mediaUrls);
    case "pinterest":
      return await apiClient.publishToPinterest(postContent, mediaUrls);
    case "snapchat":
      return await apiClient.publishToSnapchat(postContent, mediaUrls);
    default:
      throw new Error(`Platform ${platform} not supported`);
  }
}
