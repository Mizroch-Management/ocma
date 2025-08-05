-- Remove any potential conflicting constraint and fix the membership status
-- First, let's check if there's a specific constraint causing the issue
-- and update the record directly by ID to avoid constraint conflicts

UPDATE organization_members 
SET status = 'active', updated_at = now()
WHERE id = 'e28b7fce-e55d-4bc7-8e1a-669d526325ee';