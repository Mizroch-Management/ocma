// Check authentication and organization status
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAuthStatus() {
  console.log('=== CHECKING AUTHENTICATION AND ORGANIZATION STATUS ===\n');
  
  // 1. Check if any auth session exists
  console.log('1. Checking for active sessions...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Error getting session:', sessionError.message);
    return;
  }
  
  if (!session) {
    console.log('❌ No active session found');
    console.log('\nTo fix:');
    console.log('1. Open the OCMA app in your browser');
    console.log('2. Log in with your credentials');
    console.log('3. Then try saving settings again');
    return;
  }
  
  console.log('✅ Active session found');
  console.log('  User ID:', session.user.id);
  console.log('  Email:', session.user.email);
  
  // 2. Check user's organizations
  console.log('\n2. Checking user organizations...');
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      *,
      organizations (id, name, status)
    `)
    .eq('user_id', session.user.id);
  
  if (memberError) {
    console.error('❌ Error fetching memberships:', memberError.message);
  } else if (!memberships || memberships.length === 0) {
    console.log('❌ User is not a member of any organizations');
    console.log('\nTo fix:');
    console.log('1. Go to Organizations page');
    console.log('2. Create a new organization');
    console.log('3. Or join an existing organization');
  } else {
    console.log(`✅ User is member of ${memberships.length} organization(s):`);
    memberships.forEach(m => {
      console.log(`  - ${m.organizations?.name} (Role: ${m.role}, Status: ${m.status})`);
    });
  }
  
  // 3. Check if user can create settings
  console.log('\n3. Testing ability to save settings...');
  const testOrgId = memberships?.[0]?.organization_id;
  
  if (testOrgId) {
    const testKey = `test_${Date.now()}`;
    const { error: insertError } = await supabase
      .from('system_settings')
      .insert({
        setting_key: testKey,
        setting_value: { test: true },
        organization_id: testOrgId,
        category: 'test',
        description: 'Test setting'
      });
    
    if (insertError) {
      console.error('❌ Cannot save settings:', insertError.message);
      console.log('\nThis indicates RLS policies are still blocking saves');
    } else {
      console.log('✅ Successfully saved test setting');
      
      // Clean up test setting
      await supabase
        .from('system_settings')
        .delete()
        .eq('setting_key', testKey);
    }
  }
  
  // 4. Check existing settings
  console.log('\n4. Checking existing settings...');
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*');
  
  if (settingsError) {
    console.error('❌ Cannot read settings:', settingsError.message);
  } else {
    console.log(`Total settings in database: ${settings?.length || 0}`);
    if (settings && settings.length > 0) {
      const byOrg = {};
      settings.forEach(s => {
        const orgId = s.organization_id || 'global';
        byOrg[orgId] = (byOrg[orgId] || 0) + 1;
      });
      
      console.log('Settings by organization:');
      Object.entries(byOrg).forEach(([orgId, count]) => {
        console.log(`  - ${orgId}: ${count} settings`);
      });
    }
  }
  
  console.log('\n=== SUMMARY ===');
  if (session && memberships && memberships.length > 0) {
    console.log('✅ Authentication is working');
    console.log('✅ User has organization membership');
    console.log('\nThe issue might be:');
    console.log('1. Frontend not passing organization_id correctly');
    console.log('2. JavaScript errors in the browser');
    console.log('3. Network issues preventing saves');
    console.log('\nCheck browser console for errors when saving settings');
  } else {
    console.log('❌ Authentication or organization setup is incomplete');
  }
}

checkAuthStatus().catch(console.error);