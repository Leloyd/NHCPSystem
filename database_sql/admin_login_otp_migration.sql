-- Two-step administrator login using a short-lived email OTP.
-- Run this complete file in the Supabase SQL Editor before deploying the
-- matching application release. It is safe to run more than once.

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_login_otp_challenges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id bigint NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  account_version timestamp with time zone NOT NULL,
  challenge_hash text NOT NULL UNIQUE CHECK (challenge_hash ~ '^[0-9a-f]{64}$'),
  otp_hash text NOT NULL CHECK (otp_hash ~ '^[0-9a-f]{64}$'),
  request_ip_hash text NOT NULL CHECK (request_ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent_hash text NOT NULL CHECK (user_agent_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamp with time zone NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS admin_login_otp_admin_time_idx
  ON public.admin_login_otp_challenges (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_login_otp_ip_time_idx
  ON public.admin_login_otp_challenges (request_ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_login_otp_active_idx
  ON public.admin_login_otp_challenges (challenge_hash, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.admin_login_otp_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_login_otp_challenges FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_login_otp_challenges FROM anon;
REVOKE ALL ON TABLE public.admin_login_otp_challenges FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.admin_login_otp_challenges TO service_role;

-- Issue one challenge only after Flask has verified the password. Advisory
-- locks make the cooldown and rate limits safe across concurrent Vercel
-- instances. A new challenge invalidates all older unused codes.
CREATE OR REPLACE FUNCTION public.issue_admin_login_otp_challenge(
  p_admin_user_id bigint,
  p_account_version text,
  p_challenge_hash text,
  p_otp_hash text,
  p_request_ip_hash text,
  p_user_agent_hash text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp with time zone := timezone('utc', now());
  v_account_version timestamp with time zone;
BEGIN
  BEGIN
    v_account_version := p_account_version::timestamp with time zone;
  EXCEPTION WHEN OTHERS THEN
    RETURN 'invalid';
  END;

  IF p_admin_user_id IS NULL
     OR p_challenge_hash !~ '^[0-9a-f]{64}$'
     OR p_otp_hash !~ '^[0-9a-f]{64}$'
     OR p_request_ip_hash !~ '^[0-9a-f]{64}$'
     OR p_user_agent_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN 'invalid';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('admin-login-otp-admin:' || p_admin_user_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('admin-login-otp-ip:' || p_request_ip_hash, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = p_admin_user_id
      AND is_active
      AND updated_at = v_account_version
  ) THEN
    RETURN 'invalid';
  END IF;

  DELETE FROM public.admin_login_otp_challenges
  WHERE created_at < v_now - interval '7 days';

  IF EXISTS (
    SELECT 1 FROM public.admin_login_otp_challenges
    WHERE admin_user_id = p_admin_user_id
      AND created_at > v_now - interval '60 seconds'
  ) THEN
    RETURN 'cooldown';
  END IF;

  IF (SELECT count(*) FROM public.admin_login_otp_challenges
      WHERE admin_user_id = p_admin_user_id
        AND created_at >= v_now - interval '15 minutes') >= 5
     OR (SELECT count(*) FROM public.admin_login_otp_challenges
         WHERE request_ip_hash = p_request_ip_hash
           AND created_at >= v_now - interval '15 minutes') >= 10 THEN
    RETURN 'rate_limited';
  END IF;

  UPDATE public.admin_login_otp_challenges
  SET used_at = v_now
  WHERE admin_user_id = p_admin_user_id AND used_at IS NULL;

  INSERT INTO public.admin_login_otp_challenges (
    admin_user_id, account_version, challenge_hash, otp_hash,
    request_ip_hash, user_agent_hash, expires_at, created_at
  ) VALUES (
    p_admin_user_id, v_account_version, p_challenge_hash, p_otp_hash,
    p_request_ip_hash, p_user_agent_hash, v_now + interval '10 minutes', v_now
  );
  RETURN 'issued';
END;
$$;

REVOKE ALL ON FUNCTION public.issue_admin_login_otp_challenge(bigint,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_admin_login_otp_challenge(bigint,text,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.issue_admin_login_otp_challenge(bigint,text,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.issue_admin_login_otp_challenge(bigint,text,text,text,text,text) TO service_role;

-- Verify and consume a challenge atomically. A wrong code increments the
-- server-side counter; the fifth wrong code permanently consumes it.
CREATE OR REPLACE FUNCTION public.verify_admin_login_otp_challenge(
  p_challenge_hash text,
  p_otp_hash text
)
RETURNS TABLE(result text, admin_user_id bigint, attempts_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge public.admin_login_otp_challenges%ROWTYPE;
  v_now timestamp with time zone := timezone('utc', now());
  v_next_attempt_count integer;
BEGIN
  IF p_challenge_hash !~ '^[0-9a-f]{64}$' OR p_otp_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::bigint, 0;
    RETURN;
  END IF;

  SELECT challenge.* INTO v_challenge
  FROM public.admin_login_otp_challenges AS challenge
  WHERE challenge.challenge_hash = p_challenge_hash
  FOR UPDATE;

  IF NOT FOUND OR v_challenge.used_at IS NOT NULL THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::bigint, 0;
    RETURN;
  END IF;

  IF v_challenge.expires_at <= v_now THEN
    UPDATE public.admin_login_otp_challenges SET used_at = v_now WHERE id = v_challenge.id;
    RETURN QUERY SELECT 'expired'::text, NULL::bigint, 0;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = v_challenge.admin_user_id
      AND is_active
      AND updated_at = v_challenge.account_version
  ) THEN
    UPDATE public.admin_login_otp_challenges SET used_at = v_now WHERE id = v_challenge.id;
    RETURN QUERY SELECT 'stale'::text, NULL::bigint, 0;
    RETURN;
  END IF;

  IF v_challenge.otp_hash <> p_otp_hash THEN
    v_next_attempt_count := v_challenge.attempt_count + 1;
    UPDATE public.admin_login_otp_challenges
    SET attempt_count = v_next_attempt_count,
        used_at = CASE WHEN v_next_attempt_count >= 5 THEN v_now ELSE NULL END
    WHERE id = v_challenge.id;
    RETURN QUERY SELECT
      CASE WHEN v_next_attempt_count >= 5 THEN 'locked' ELSE 'incorrect' END::text,
      NULL::bigint,
      greatest(0, 5 - v_next_attempt_count);
    RETURN;
  END IF;

  UPDATE public.admin_login_otp_challenges SET used_at = v_now WHERE id = v_challenge.id;
  RETURN QUERY SELECT 'verified'::text, v_challenge.admin_user_id, greatest(0, 5 - v_challenge.attempt_count);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_login_otp_challenge(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_admin_login_otp_challenge(text,text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_admin_login_otp_challenge(text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_login_otp_challenge(text,text) TO service_role;

COMMIT;
