from __future__ import annotations

from typing import Any

from supabase_client import get_supabase_client


MAPS = "site_maps"
REVISIONS = "site_map_revisions"


def _rows(response) -> list[dict[str, Any]]:
    return list(getattr(response, "data", None) or [])


def get_site_map() -> dict[str, Any] | None:
    rows = _rows(
        get_supabase_client().table(MAPS).select("*")
        .eq("is_system_original", True).limit(1).execute()
    )
    return rows[0] if rows else None


def get_revision(revision_id: int) -> dict[str, Any] | None:
    rows = _rows(
        get_supabase_client().table(REVISIONS).select("*")
        .eq("id", int(revision_id)).limit(1).execute()
    )
    return rows[0] if rows else None


def list_revisions(site_map_id: int) -> list[dict[str, Any]]:
    return _rows(
        get_supabase_client().table(REVISIONS).select("*")
        .eq("site_map_id", int(site_map_id)).order("version_number").execute()
    )


def create_site_map(config: dict[str, Any], *, created_by: str) -> dict[str, Any]:
    client = get_supabase_client()
    map_rows = _rows(client.table(MAPS).insert({
        "is_system_original": True,
        "created_by": str(created_by or ""),
    }).execute())
    if not map_rows:
        raise RuntimeError("Supabase did not create the Site Map override.")
    site_map = map_rows[0]
    try:
        revision_rows = _rows(client.table(REVISIONS).insert({
            "site_map_id": site_map["id"],
            "version_number": 1,
            "state": "draft",
            "config": config,
            "created_by": str(created_by or ""),
        }).execute())
        if not revision_rows:
            raise RuntimeError("Supabase did not create the first Site Map revision.")
        revision = revision_rows[0]
        updated = _rows(
            client.table(MAPS).update({"draft_revision_id": revision["id"]})
            .eq("id", site_map["id"]).execute()
        )
        return updated[0] if updated else {**site_map, "draft_revision_id": revision["id"]}
    except Exception:
        client.table(MAPS).delete().eq("id", site_map["id"]).execute()
        raise


def update_revision_config(revision_id: int, config: dict[str, Any]) -> dict[str, Any]:
    rows = _rows(
        get_supabase_client().table(REVISIONS).update({"config": config})
        .eq("id", int(revision_id)).execute()
    )
    if not rows:
        raise RuntimeError("The Site Map draft could not be saved.")
    return rows[0]


def publish_site_map(site_map_id: int, *, created_by: str) -> dict[str, Any]:
    client = get_supabase_client()
    client.rpc("publish_site_map_revision", {
        "p_site_map_id": int(site_map_id),
        "p_admin": str(created_by or ""),
    }).execute()
    updated = get_site_map()
    if not updated:
        raise RuntimeError("The published Site Map could not be reloaded.")
    return updated


def delete_site_map(site_map_id: int) -> None:
    get_supabase_client().table(MAPS).delete().eq("id", int(site_map_id)).execute()
