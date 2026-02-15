CREATE TABLE IF NOT EXISTS public.diary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  mood text NOT NULL,
  mood_level integer NOT NULL DEFAULT 3,
  image_urls text[] NULL,
  is_encrypted boolean NOT NULL DEFAULT true,
  CONSTRAINT diary_pkey PRIMARY KEY (id)
);
ALTER TABLE public.diary ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'diary' AND policyname = 'Public access'
    ) THEN
        CREATE POLICY "Public access" ON public.diary FOR ALL USING (true);
    END IF;
END
$$;
