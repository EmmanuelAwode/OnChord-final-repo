-- Preserve playlist invite records when users dismiss notifications.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_hidden boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_is_hidden_idx ON public.notifications(is_hidden);
