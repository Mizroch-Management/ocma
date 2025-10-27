import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticateRequest,
  ensureOrganizationAccess,
  supabaseAdmin,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SchedulePostRequest {
  content: string;
  platforms: string[];
  media?: Array<{ url: string; type?: string }>;
  publishAt: string;
  timezone?: string;
  organizationId: string;
  metadata?: Record<string, unknown>;
}

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
    const {
      content,
      platforms,
      media,
      publishAt,
      timezone,
      organizationId,
      metadata = {},
    }: SchedulePostRequest = await req.json();

    if (!content?.trim() || !Array.isArray(platforms) || platforms.length === 0) {
      return new Response(
        JSON.stringify({ error: "Content and at least one platform are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hasAccess = await ensureOrganizationAccess(user.id, organizationId);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "You do not have access to this organization." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const scheduledAt = new Date(publishAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return new Response(
        JSON.stringify({ error: "publishAt must be a valid ISO date string." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const insertPayload = {
      user_id: user.id,
      organization_id: organizationId,
      content,
      platforms,
      media_urls: media?.map((item) => item.url) ?? [],
      scheduled_at: scheduledAt.toISOString(),
      status: "pending",
      max_attempts: 3,
      attempts: 0,
      metadata: {
        ...metadata,
        timezone: timezone || "UTC",
        media,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("scheduled_posts")
      .insert(insertPayload)
      .select("id, scheduled_at, status")
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId: data.id,
        scheduledAt: data.scheduled_at,
        status: data.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error scheduling post:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
