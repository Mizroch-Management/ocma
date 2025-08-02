-- Fix the database relationship issue by adding proper foreign key constraint
-- This will fix the "Could not find a relationship" error
ALTER TABLE generated_content 
ADD CONSTRAINT fk_generated_content_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;