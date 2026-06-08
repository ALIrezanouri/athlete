-- Migration: Fix wallet top-up RLS policy for athletes
-- Problem: Migration 20240522 dropped "Users can create own wallet transactions" INSERT policy
-- and replaced it with admin-only INSERT policy, breaking athlete self-service top-ups.
-- Fix: Restore the user self-service INSERT policy alongside the admin one.
-- Date: 20240603

-- Restore athlete self-service INSERT policy for wallet_transactions
-- This allows athletes to top up their own wallet via the topUpWallet() server action.
-- The admin-only INSERT policy ("Admins can insert wallet transactions") remains in place
-- for admin operations like addFunds().
CREATE POLICY "Users can create own wallet transactions"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK (profile_id = auth.uid());