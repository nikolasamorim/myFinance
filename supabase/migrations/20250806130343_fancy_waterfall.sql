/*
  # Add user profile fields

  1. New Columns
    - Add comprehensive user profile fields to users table
    - Add avatar_url, tags, description, personal information fields
    - Add two_factor_enabled for 2FA support
    - Add identification_code as unique identifier

  2. Security
    - Maintain existing RLS policies
    - Add indexes for performance

  3. Storage
    - Create avatars bucket for profile pictures
*/

-- Add new columns to users table
DO $$
BEGIN
  -- Profile fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tags') THEN
    ALTER TABLE users ADD COLUMN tags text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'description') THEN
    ALTER TABLE users ADD COLUMN description text;
  END IF;

  -- Personal information fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'gender') THEN
    ALTER TABLE users ADD COLUMN gender text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'birth_date') THEN
    ALTER TABLE users ADD COLUMN birth_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'identification_code') THEN
    ALTER TABLE users ADD COLUMN identification_code text UNIQUE DEFAULT ('USR-' || upper(substring(gen_random_uuid()::text, 1, 8)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hometown') THEN
    ALTER TABLE users ADD COLUMN hometown text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nationality') THEN
    ALTER TABLE users ADD COLUMN nationality text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'languages') THEN
    ALTER TABLE users ADD COLUMN languages text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'marital_status') THEN
    ALTER TABLE users ADD COLUMN marital_status text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'permanent_address') THEN
    ALTER TABLE users ADD COLUMN permanent_address text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_address') THEN
    ALTER TABLE users ADD COLUMN current_address text;
  END IF;

  -- Security fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
    ALTER TABLE users ADD COLUMN two_factor_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add constraints for gender and marital_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'users_gender_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_gender_check 
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'users_marital_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_marital_status_check 
    CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'other'));
  END IF;
END $$;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');