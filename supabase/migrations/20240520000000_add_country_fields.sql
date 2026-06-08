-- ============================================================
-- Add default_locale to countries table
-- phone_prefix already exists from the initial migration
-- ============================================================

ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS default_locale TEXT DEFAULT 'fa';

-- Update existing country data with locale info
UPDATE public.countries SET default_locale = 'fa' WHERE id = 'IR';
UPDATE public.countries SET default_locale = 'ar' WHERE id = 'AE';
UPDATE public.countries SET default_locale = 'en' WHERE id = 'US';
UPDATE public.countries SET default_locale = 'tr' WHERE id = 'TR';
