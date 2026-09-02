-- Secure recovery for custom administrator accounts.
-- Run this complete file in the Supabase SQL editor before enabling the
-- Forgot Password link in production. It is safe to run again.

CREATE TABLE IF NOT EXISTS public.admin_password_reset_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id bigint REFERENCES public.admin_users(id) ON DELETE SET NULL,
  email_hash text NOT NULL CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  request_ip_hash text NOT NULL CHECK (request_ip_hash ~ '^[0-9a-f]{64}$'),
  requested_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS admin_password_reset_requests_email_time_idx
  ON public.admin_password_reset_requests (email_hash, requested_at DESC);
CREATE INDEX IF NOT EXISTS admin_password_reset_requests_ip_time_idx
  ON public.admin_password_reset_requests (request_ip_hash, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_password_reset_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id bigint NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS admin_password_reset_tokens_user_time_idx
  ON public.admin_password_reset_tokens (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_password_reset_tokens_active_idx
  ON public.admin_password_reset_tokens (token_hash, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.admin_password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Record every syntactically valid request, including requests for unknown
-- addresses. Only HMAC digests of the submitted email and client IP are kept.
-- A known active account may receive at most three links per hour, while one
-- client network may submit at most ten requests per hour.
CREATE OR REPLACE FUNCTION public.issue_admin_password_reset_token(
  p_email text,
  p_email_hash text,
  p_request_ip_hash text,
  p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id bigint;
  v_now timestamp with time zone := timezone('utc', now());
BEGIN
  IF p_email_hash IS NULL
     OR p_request_ip_hash IS NULL
     OR p_token_hash IS NULL
     OR p_email_hash !~ '^[0-9a-f]{64}$'
     OR p_request_ip_hash !~ '^[0-9a-f]{64}$'
     OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;

  -- Retain enough history for throttling and incident review without allowing
  -- these operational tables to grow indefinitely.
  DELETE FROM public.admin_password_reset_requests
    WHERE requested_at < v_now - interval '7 days';
  DELETE FROM public.admin_password_reset_tokens
    WHERE created_at < v_now - interval '7 days';

  -- Serialize counters for the same identity and client so concurrent
  -- serverless requests cannot race past either limit.
  PERFORM pg_advisory_xact_lock(hashtextextended('admin-reset-email:' || p_email_hash, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('admin-reset-ip:' || p_request_ip_hash, 0));

  IF (SELECT count(*) FROM public.admin_password_reset_requests
      WHERE email_hash = p_email_hash
        AND requested_at >= v_now - interval '1 hour') >= 3
     OR (SELECT count(*) FROM public.admin_password_reset_requests
         WHERE request_ip_hash = p_request_ip_hash
           AND requested_at >= v_now - interval '1 hour') >= 10 THEN
    RETURN false;
  END IF;

  SELECT id INTO v_admin_user_id
  FROM public.admin_users
  WHERE email = lower(btrim(p_email)) AND is_active
  LIMIT 1;

  INSERT INTO public.admin_password_reset_requests (
    admin_user_id, email_hash, request_ip_hash, requested_at
  ) VALUES (
    v_admin_user_id, p_email_hash, p_request_ip_hash, v_now
  );

  IF v_admin_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.admin_password_reset_tokens (
    admin_user_id, token_hash, expires_at, created_at
  ) VALUES (
    v_admin_user_id, p_token_hash, v_now + interval '30 minutes', v_now
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_admin_password_reset_token(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_admin_password_reset_token(text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.issue_admin_password_reset_token(text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.issue_admin_password_reset_token(text, text, text, text) TO service_role;

-- Consume the selected token and update the password in the same transaction.
-- All other outstanding links for that administrator are consumed as well.
CREATE OR REPLACE FUNCTION public.consume_admin_password_reset_token(
  p_token_hash text,
  p_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id bigint;
  v_now timestamp with time zone := timezone('utc', now());
BEGIN
  IF p_token_hash IS NULL
     OR p_password_hash IS NULL
     OR p_token_hash !~ '^[0-9a-f]{64}$'
     OR char_length(p_password_hash) < 20
     OR char_length(p_password_hash) > 1024 THEN
    RETURN false;
  END IF;

  SELECT token.admin_user_id INTO v_admin_user_id
  FROM public.admin_password_reset_tokens AS token
  JOIN public.admin_users AS admin_user ON admin_user.id = token.admin_user_id
  WHERE token.token_hash = p_token_hash
    AND token.used_at IS NULL
    AND token.expires_at > v_now
    AND admin_user.is_active
  FOR UPDATE OF token, admin_user;

  IF v_admin_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.admin_users
  SET password_hash = p_password_hash,
      updated_at = v_now
  WHERE id = v_admin_user_id AND is_active;

  UPDATE public.admin_password_reset_tokens
  SET used_at = v_now
  WHERE admin_user_id = v_admin_user_id AND used_at IS NULL;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_admin_password_reset_token(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_admin_password_reset_token(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.consume_admin_password_reset_token(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_admin_password_reset_token(text, text) TO service_role;
