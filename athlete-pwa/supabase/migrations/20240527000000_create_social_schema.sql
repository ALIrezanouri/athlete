-- ============================================================
-- Phase 3: Social Network Schema
-- User follows, workout sharing, likes, comments, feed
-- ============================================================

-- ============================================================
-- 1. USER_FOLLOWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(follower_id, following_id),
    CONSTRAINT cannot_follow_self CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read follows"
    ON public.user_follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.user_follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.user_follows FOR DELETE
    USING (auth.uid() = follower_id);

-- ============================================================
-- 2. WORKOUT_LIKES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, workout_session_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_likes_workout ON public.workout_likes(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_workout_likes_user ON public.workout_likes(user_id);

ALTER TABLE public.workout_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workout likes are publicly readable"
    ON public.workout_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like workouts"
    ON public.workout_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
    ON public.workout_likes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 3. WORKOUT_COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_comments_workout ON public.workout_comments(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_workout_comments_user ON public.workout_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_comments_created ON public.workout_comments(created_at DESC);

ALTER TABLE public.workout_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workout comments are publicly readable"
    ON public.workout_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can create comments"
    ON public.workout_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON public.workout_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON public.workout_comments FOR DELETE
    USING (auth.uid() = user_id);

CREATE TRIGGER trg_workout_comments_updated_at
    BEFORE UPDATE ON public.workout_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. Add is_shared column to workout_sessions
-- ============================================================
ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- ============================================================
-- 5. Add follower/following counts to profiles
-- ============================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS workout_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 6. FUNCTION: Update follower counts
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        UPDATE public.profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_user_follows_count
    AFTER INSERT OR DELETE ON public.user_follows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_follow_counts();

-- ============================================================
-- 7. FUNCTION: Update like count trigger (add like_count to workouts)
-- ============================================================
ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_workout_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.workout_sessions SET like_count = like_count + 1 WHERE id = NEW.workout_session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.workout_sessions SET like_count = like_count - 1 WHERE id = OLD.workout_session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_workout_likes_count
    AFTER INSERT OR DELETE ON public.workout_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workout_like_count();

-- ============================================================
-- 8. FUNCTION: Update comment count
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_workout_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.workout_sessions SET comment_count = comment_count + 1 WHERE id = NEW.workout_session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.workout_sessions SET comment_count = comment_count - 1 WHERE id = OLD.workout_session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_workout_comments_count
    AFTER INSERT OR DELETE ON public.workout_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workout_comment_count();

-- ============================================================
-- 9. FUNCTION: Update user workout count
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_workout_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE public.profiles SET workout_count = workout_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
        UPDATE public.profiles SET workout_count = workout_count + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_workout_sessions_user_count
    AFTER INSERT OR UPDATE ON public.workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_workout_count();