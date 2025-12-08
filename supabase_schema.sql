-- Supabase Medical Consultant App Schema
-- Safe to run multiple times in Supabase SQL editor.

-- Extensions
create extension if not exists "pgcrypto";

-- Enums (idempotent via DO blocks)
DO $$ BEGIN
  CREATE TYPE gender_enum AS ENUM ('male','female','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE blood_type_enum AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consultation_status_enum AS ENUM ('open','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_role_enum AS ENUM ('user','assistant','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  age int CHECK (age >= 0),
  gender gender_enum,
  blood_type blood_type_enum,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Per-user health profile and basic demographics';

CREATE TABLE IF NOT EXISTS public.allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.allergies IS 'User-defined allergies';

CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text,
  frequency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.medications IS 'Active medications with dosage and frequency';

CREATE TABLE IF NOT EXISTS public.conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  severity text,
  diagnosed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.conditions IS 'Chronic or acute medical conditions';

CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  summary text,
  status consultation_status_enum NOT NULL DEFAULT 'open',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
COMMENT ON TABLE public.consultations IS 'Consultation sessions per user';

CREATE TABLE IF NOT EXISTS public.consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  role message_role_enum NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.consultation_messages IS 'Chat messages linked to a consultation';

CREATE TABLE IF NOT EXISTS public.consultation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes integer CHECK (size_bytes >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.consultation_attachments IS 'Files uploaded during a consultation (path points to Storage)';

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_allergies ON public.allergies;
CREATE TRIGGER set_updated_at_allergies BEFORE UPDATE ON public.allergies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_medications ON public.medications;
CREATE TRIGGER set_updated_at_medications BEFORE UPDATE ON public.medications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_conditions ON public.conditions;
CREATE TRIGGER set_updated_at_conditions BEFORE UPDATE ON public.conditions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_attachments ENABLE ROW LEVEL SECURITY;

-- Single-owner policy per table (simplified and idempotent)
-- Profiles: owner is the row's user_id
DROP POLICY IF EXISTS "Owner can access own rows" ON public.profiles;
CREATE POLICY "Owner can access own rows" ON public.profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allergies
DROP POLICY IF EXISTS "Owner can access own rows" ON public.allergies;
CREATE POLICY "Owner can access own rows" ON public.allergies
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Medications
DROP POLICY IF EXISTS "Owner can access own rows" ON public.medications;
CREATE POLICY "Owner can access own rows" ON public.medications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Conditions
DROP POLICY IF EXISTS "Owner can access own rows" ON public.conditions;
CREATE POLICY "Owner can access own rows" ON public.conditions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Consultations
DROP POLICY IF EXISTS "Owner can access own rows" ON public.consultations;
CREATE POLICY "Owner can access own rows" ON public.consultations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Consultation messages: ownership via parent consultation
DROP POLICY IF EXISTS "Owner can access own rows" ON public.consultation_messages;
CREATE POLICY "Owner can access own rows" ON public.consultation_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = consultation_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = consultation_id AND c.user_id = auth.uid()
  )
);

-- Consultation attachments: ownership via parent consultation
DROP POLICY IF EXISTS "Owner can access own rows" ON public.consultation_attachments;
CREATE POLICY "Owner can access own rows" ON public.consultation_attachments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = consultation_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = consultation_id AND c.user_id = auth.uid()
  )
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_allergies_user_id ON public.allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_allergies_created_at ON public.allergies(created_at);
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON public.medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_created_at ON public.medications(created_at);
CREATE INDEX IF NOT EXISTS idx_conditions_user_id ON public.conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_conditions_created_at ON public.conditions(created_at);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON public.consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_started_at ON public.consultations(started_at);
CREATE INDEX IF NOT EXISTS idx_messages_consultation_id ON public.consultation_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.consultation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_consultation_id ON public.consultation_attachments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON public.consultation_attachments(created_at);

-- End of schema