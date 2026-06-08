-- ============================================================
-- Create admin_config table for system configuration
-- Singleton row pattern: one row with key='system_config'
-- The value column stores a JSON string with all config settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto-update updated_at
CREATE TRIGGER trg_admin_config_updated_at
    BEFORE UPDATE ON public.admin_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy
CREATE POLICY "Admins can read admin_config"
    ON public.admin_config FOR SELECT
    TO authenticated
    USING (is_admin());

-- Admin-only insert policy
CREATE POLICY "Admins can insert admin_config"
    ON public.admin_config FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Admin-only update policy
CREATE POLICY "Admins can update admin_config"
    ON public.admin_config FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Seed default configuration row
INSERT INTO public.admin_config (key, value, description) VALUES (
    'system_config',
    '{"site_name":"rokhdad FIT","site_description":"پلتفرم باشگاه و ورزش","contact_email":"admin@rokhdad.fit","contact_phone":"","maintenance_mode":false,"enable_registration":true,"enable_booking_system":true,"enable_wallet_system":true,"enable_reviews":true,"enable_notifications":true}',
    'تنظیمات اصلی سیستم'
);