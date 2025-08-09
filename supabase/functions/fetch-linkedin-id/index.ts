import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { access_token } = await req.json();
    
    if (!access_token) {
      throw new Error('LinkedIn access token is required');
    }
    
    // Try the userinfo endpoint first (most reliable)
    let personId = null;
    let organizationId = null;
    
    try {
      const userinfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      
      if (userinfoResponse.ok) {
        const userinfo = await userinfoResponse.json();
        personId = userinfo.sub;
        console.log('Got person ID from userinfo:', personId);
      }
    } catch (error) {
      console.log('Userinfo endpoint failed:', error);
    }
    
    // Fallback to me endpoint if userinfo didn't work
    if (!personId) {
      try {
        const meResponse = await fetch('https://api.linkedin.com/v2/me', {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        
        if (meResponse.ok) {
          const meData = await meResponse.json();
          personId = meData.id;
          console.log('Got person ID from me endpoint:', personId);
        }
      } catch (error) {
        console.log('Me endpoint failed:', error);
      }
    }
    
    // Try to get organization IDs if user manages any
    try {
      const orgsResponse = await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      
      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json();
        if (orgsData.elements && orgsData.elements.length > 0) {
          // Extract organization ID from the first element
          const orgUrn = orgsData.elements[0].organizationalTarget;
          if (orgUrn && orgUrn.includes('organization:')) {
            organizationId = orgUrn.split('organization:')[1];
            console.log('Got organization ID:', organizationId);
          }
        }
      }
    } catch (error) {
      console.log('Organizations endpoint failed:', error);
    }
    
    if (!personId && !organizationId) {
      throw new Error('Unable to fetch LinkedIn person or organization ID. Please check your access token permissions.');
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        person_id: personId,
        organization_id: organizationId,
        message: personId ? 'Successfully fetched LinkedIn IDs' : 'Only organization ID found'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching LinkedIn ID:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});