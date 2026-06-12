-- Step 1: Add check_in_code and checked_in_at columns to bookings table
-- Booking Ticket / Entry Pass Feature

-- Add columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_code ON public.bookings(check_in_code);

-- Function to generate unique 6-char alphanumeric code
-- Charset: uppercase + digits, excluding ambiguous chars (0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public.generate_check_in_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE check_in_code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill existing upcoming bookings with check_in_code
UPDATE public.bookings
SET check_in_code = public.generate_check_in_code()
WHERE status = 'upcoming' AND check_in_code IS NULL;

-- Make check_in_code NOT NULL for future integrity (nullable for old non-upcoming bookings)
-- We keep it nullable since old completed/cancelled bookings won't have codes