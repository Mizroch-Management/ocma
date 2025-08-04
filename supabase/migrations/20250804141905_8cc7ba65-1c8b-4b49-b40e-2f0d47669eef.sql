-- Add foreign key relationship between organization_members and profiles
ALTER TABLE organization_members 
ADD CONSTRAINT fk_organization_members_profiles 
FOREIGN KEY (user_id) REFERENCES profiles(user_id);