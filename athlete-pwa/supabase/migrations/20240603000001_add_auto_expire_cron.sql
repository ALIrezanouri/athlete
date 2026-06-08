-- ============================================================
-- Step 2: pg_cron job to auto-expire past bookings
-- ============================================================
-- Runs hourly. Transitions 'upcoming' bookings to 'expired'
-- when the time slot's date+end_time has passed.

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ── Function: auto-expire bookings whose time slot has passed ──
CREATE OR REPLACE FUNCTION public.auto_expire_bookings()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.bookings b
  SET status = 'expired'
  FROM public.gym_time_slots ts
  WHERE b.time_slot_id = ts.id
    AND b.status = 'upcoming'
    AND (ts.date + ts.end_time) < now();
END;
$$;

-- ── Schedule: run every hour at minute 0 ──
SELECT cron.schedule(
  'auto-expire-bookings',
  '0 * * * *',
  'SELECT public.auto_expire_bookings()'
);