import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import {
  authenticateRequest,
  ensureOrganizationRole,
} from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeamInvitationRequest {
  email: string;
  name: string;
  role: string;
  invitationToken: string;
  organizationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
      email,
      name,
      role,
      invitationToken,
      organizationId,
    }: TeamInvitationRequest = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const hasPrivilegedRole = await ensureOrganizationRole(user.id, organizationId, [
      "owner",
      "admin",
    ]);

    if (!hasPrivilegedRole) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to invite members." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const invitationUrl = `${req.headers.get('origin') || 'https://your-app.lovable.app'}/team/accept?token=${invitationToken}`;

    const emailResponse = await resend.emails.send({
      from: "Team Invitations <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to join our team!",
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #333; text-align: center;">You're Invited!</h1>
          <p>Hi ${name || 'there'},</p>
          <p>You've been invited to join our content management team as a <strong>${role}</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
            ${invitationUrl}
          </p>
          
          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Sent from Content Management Team
          </p>
        </div>
      `,
    });

    console.log("Team invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in send-team-invitation function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
