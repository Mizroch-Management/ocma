-- Fix Eli Mizroch's ownership status in ScamDunk organization
UPDATE organization_members 
SET status = 'active', updated_at = now()
WHERE user_id = '538f4327-9f62-459c-b81a-ec567e089aae'
  AND organization_id = 'bc3dcaec-3aa8-4f99-8f23-98cdc120f6c1'
  AND status = 'inactive';