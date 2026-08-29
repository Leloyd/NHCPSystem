from __future__ import annotations

from typing import Any

from supabase_client import get_supabase_client


TOURS = "virtual_tours"
REVISIONS = "virtual_tour_revisions"
SCENES = "virtual_tour_scenes"
HOTSPOTS = "virtual_tour_hotspots"


def _rows(response) -> list[dict[str, Any]]:
    return list(getattr(response, "data", None) or [])


def list_tours() -> list[dict[str, Any]]:
    response = get_supabase_client().table(TOURS).select("*").order("sort_order").order("created_at").execute()
    return _rows(response)


def list_public_tours() -> list[dict[str, Any]]:
    response = (
        get_supabase_client().table(TOURS).select("*")
        .eq("status", "active")
        .order("sort_order").order("title_en").execute()
    )
    return [row for row in _rows(response) if row.get("published_revision_id")]


def get_tour(tour_id: int) -> dict[str, Any] | None:
    rows = _rows(get_supabase_client().table(TOURS).select("*").eq("id", int(tour_id)).limit(1).execute())
    return rows[0] if rows else None


def get_tour_by_slug(slug: str, *, public_only: bool = False) -> dict[str, Any] | None:
    query = get_supabase_client().table(TOURS).select("*").eq("slug", str(slug))
    if public_only:
        query = query.eq("status", "active")
    rows = _rows(query.limit(1).execute())
    if not rows or (public_only and not rows[0].get("published_revision_id")):
        return None
    return rows[0]


def get_system_original() -> dict[str, Any] | None:
    rows = _rows(get_supabase_client().table(TOURS).select("*").eq("is_system_original", True).limit(1).execute())
    return rows[0] if rows else None


def delete_tour(tour_id: int) -> None:
    get_supabase_client().table(TOURS).delete().eq("id", int(tour_id)).execute()


def create_tour(payload: dict[str, Any], *, created_by: str) -> dict[str, Any]:
    client = get_supabase_client()
    tour_rows = _rows(client.table(TOURS).insert({**payload, "created_by": created_by}).execute())
    if not tour_rows:
        raise RuntimeError("Supabase did not return the created virtual tour.")
    tour = tour_rows[0]
    revision_rows = _rows(client.table(REVISIONS).insert({
        "tour_id": tour["id"], "version_number": 1, "state": "draft", "created_by": created_by,
    }).execute())
    if not revision_rows:
        client.table(TOURS).delete().eq("id", tour["id"]).execute()
        raise RuntimeError("Supabase did not create the initial tour revision.")
    revision = revision_rows[0]
    updated = _rows(client.table(TOURS).update({"draft_revision_id": revision["id"]}).eq("id", tour["id"]).execute())
    return updated[0] if updated else {**tour, "draft_revision_id": revision["id"]}


def update_tour(tour_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    rows = _rows(get_supabase_client().table(TOURS).update(payload).eq("id", int(tour_id)).execute())
    if not rows:
        raise RuntimeError("Virtual tour could not be updated.")
    return rows[0]


def get_revision(revision_id: int) -> dict[str, Any] | None:
    rows = _rows(get_supabase_client().table(REVISIONS).select("*").eq("id", int(revision_id)).limit(1).execute())
    return rows[0] if rows else None


def update_revision_map_config(revision_id: int, map_config: dict[str, Any]) -> dict[str, Any]:
    rows = _rows(
        get_supabase_client().table(REVISIONS)
        .update({"map_config": map_config}).eq("id", int(revision_id)).execute()
    )
    if not rows:
        raise RuntimeError("The virtual-tour map could not be updated.")
    return rows[0]


def list_revisions(tour_id: int) -> list[dict[str, Any]]:
    return _rows(
        get_supabase_client().table(REVISIONS).select("*")
        .eq("tour_id", int(tour_id)).order("version_number").execute()
    )


def list_scenes(revision_id: int) -> list[dict[str, Any]]:
    return _rows(get_supabase_client().table(SCENES).select("*").eq("revision_id", int(revision_id)).order("sort_order").order("id").execute())


def get_scene(scene_id: int) -> dict[str, Any] | None:
    rows = _rows(get_supabase_client().table(SCENES).select("*").eq("id", int(scene_id)).limit(1).execute())
    return rows[0] if rows else None


def create_scene(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    if payload.get("is_start_scene"):
        client.table(SCENES).update({"is_start_scene": False}).eq("revision_id", payload["revision_id"]).execute()
    rows = _rows(client.table(SCENES).insert(payload).execute())
    if not rows:
        raise RuntimeError("Scene could not be created.")
    return rows[0]


def create_scenes(payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not payloads:
        return []
    rows = _rows(get_supabase_client().table(SCENES).insert(payloads).execute())
    if len(rows) != len(payloads):
        raise RuntimeError("Not all virtual-tour scenes could be created.")
    return rows


def update_scene(scene_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    current = get_scene(scene_id)
    if not current:
        raise ValueError("Scene was not found.")
    requested_start = bool(payload.pop("is_start_scene", False))
    if requested_start:
        client.rpc("set_virtual_tour_start_scene", {
            "p_revision_id": int(current["revision_id"]), "p_scene_id": int(scene_id),
        }).execute()
    if not payload:
        updated = get_scene(scene_id)
        if not updated:
            raise RuntimeError("Scene could not be updated.")
        return updated
    rows = _rows(client.table(SCENES).update(payload).eq("id", int(scene_id)).execute())
    if not rows:
        raise RuntimeError("Scene could not be updated.")
    return rows[0]


def delete_scene(scene_id: int) -> None:
    get_supabase_client().table(SCENES).delete().eq("id", int(scene_id)).execute()


def list_hotspots(revision_id: int) -> list[dict[str, Any]]:
    return _rows(get_supabase_client().table(HOTSPOTS).select("*").eq("revision_id", int(revision_id)).order("sort_order").order("id").execute())


def get_hotspot(hotspot_id: int) -> dict[str, Any] | None:
    rows = _rows(get_supabase_client().table(HOTSPOTS).select("*").eq("id", int(hotspot_id)).limit(1).execute())
    return rows[0] if rows else None


def create_hotspot(payload: dict[str, Any]) -> dict[str, Any]:
    rows = _rows(get_supabase_client().table(HOTSPOTS).insert(payload).execute())
    if not rows:
        raise RuntimeError("Hotspot could not be created.")
    return rows[0]


def create_hotspots(payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not payloads:
        return []
    rows = _rows(get_supabase_client().table(HOTSPOTS).insert(payloads).execute())
    if len(rows) != len(payloads):
        raise RuntimeError("Not all virtual-tour hotspots could be created.")
    return rows


def update_hotspot(hotspot_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    rows = _rows(get_supabase_client().table(HOTSPOTS).update(payload).eq("id", int(hotspot_id)).execute())
    if not rows:
        raise RuntimeError("Hotspot could not be updated.")
    return rows[0]


def delete_hotspot(hotspot_id: int) -> None:
    get_supabase_client().table(HOTSPOTS).delete().eq("id", int(hotspot_id)).execute()


def publish_revision(tour: dict[str, Any], *, created_by: str) -> dict[str, Any]:
    client = get_supabase_client()
    client.rpc("publish_virtual_tour_revision", {
        "p_tour_id": int(tour["id"]), "p_admin": str(created_by or ""),
    }).execute()
    updated = get_tour(int(tour["id"]))
    if not updated:
        raise RuntimeError("The published virtual tour could not be reloaded.")
    return updated
