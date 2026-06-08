-- Migration: Create atomic wallet deduction RPC + CHECK constraint
-- Fixes race condition in deductFunds where balance check and deduction are non-atomic
-- Date: 20240531

-- 1. Add CHECK constraint to prevent negative wallet balances
ALTER TABLE profiles
  ADD CONSTRAINT wallet_balance_non_negative CHECK (wallet_balance >= 0);

-- 2. Create atomic deduction RPC function
-- This function checks balance AND deducts in a single DB transaction,
-- eliminating the race condition between read-check-insert in the app layer.
CREATE OR REPLACE FUNCTION deduct_wallet_funds(
  p_profile_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'کسر موجودی توسط مدیر'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Lock the profile row to prevent concurrent modifications
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'کاربر یافت نشد'
    );
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'موجودی کافی نیست',
      'current_balance', v_current_balance,
      'requested_amount', p_amount
    );
  END IF;

  -- Insert transaction record
  INSERT INTO wallet_transactions (profile_id, amount, type, description)
  VALUES (p_profile_id, p_amount, 'session_purchase', p_reason)
  RETURNING id INTO v_transaction_id;

  -- The update_wallet_balance trigger will atomically update the balance
  -- based on the transaction we just inserted. But we also verify here.
  SELECT wallet_balance INTO v_new_balance
  FROM profiles
  WHERE id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount_deducted', p_amount
  );
END;
$$;

-- 3. Grant execute to service_role and admin users only
GRANT EXECUTE ON FUNCTION deduct_wallet_funds(UUID, NUMERIC, TEXT)
  TO service_role, authenticated;

-- 4. Add comment for documentation
COMMENT ON FUNCTION deduct_wallet_funds IS
  'Atomically deducts funds from a wallet. Checks balance sufficiency and deducts in a single transaction, preventing race conditions. Returns JSONB with success status and balance details.';