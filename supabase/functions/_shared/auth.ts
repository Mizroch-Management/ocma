import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase credentials are not configured for edge functions.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

interface AuthSuccess {
  user: User;
  token: string;
}

interface AuthFailure {
  errorResponse: Response;
}

export async function authenticateRequest(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Authorization token is required.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Authorization token is invalid.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Unable to authenticate request.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return { user: data.user, token };
}

export async function ensureOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (!organizationId) {
    return false;
  }

  const { data } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle();

  return Boolean(data);
}

export async function ensureOrganizationRole(
  userId: string,
  organizationId: string,
  allowedRoles: string[]
): Promise<boolean> {
  if (!organizationId || allowedRoles.length === 0) {
    return false;
  }

  const { data } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle();

  if (!data?.role) {
    return false;
  }

  return allowedRoles.includes(data.role);
}
