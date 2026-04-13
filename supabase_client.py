import os
from functools import lru_cache

from supabase import Client, create_client


class SupabaseConfigError(RuntimeError):
    pass


def is_supabase_configured() -> bool:
    return bool((os.getenv("SUPABASE_URL") or "").strip() and (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip())


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
    service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

    if not supabase_url or not service_role_key:
        raise SupabaseConfigError("Supabase is not fully configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")

    return create_client(supabase_url, service_role_key)
