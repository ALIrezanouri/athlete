-- ============================================================
-- Add check_in_code column to bookings table
-- The application code generates a 6-char alphanumeric code for
-- each booking that athletes show at gym check-in.
-- ============================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS check_in_code TEXT;

-- Create an index for fast lookups at gym check-in
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_code
ON public.bookings(check_in_code)
WHERE check_in_code IS NOT NULL;