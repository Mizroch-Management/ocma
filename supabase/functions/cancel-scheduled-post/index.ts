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

interface CancelPostRequest {
  postId: string;
  organizationId: string;
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
    const { postId, organizationId }: CancelPostRequest = await req.json();

    if (!postId || !organizationId) {
      return new Response(
        JSON.stringify({ success: false, error: "postId and organizationId are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hasAccess = await ensureOrganizationAccess(user.id, organizationId);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ success: false, error: "You do not have access to this organization." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error } = await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, postId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error cancelling scheduled post:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
