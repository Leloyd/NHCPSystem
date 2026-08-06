from __future__ import annotations

from typing import Any

from edu_resources_content import load_public_edu_resources
from heritage_keeper_content import empty_heritage_keeper_progress, load_heritage_keeper_progress
from online_gallery_content import load_public_online_gallery_items
from participation_submissions_repository import list_participation_submissions_for_user
from supabase_client import SupabaseConfigError, is_supabase_configured
from tour_bookings_content import load_user_tour_bookings
from user_bookmarks_repository import list_user_bookmarks
from visitor_feedback_repository import list_visitor_feedback_for_user


BOOKMARK_ITEM_TYPE_ONLINE_GALLERY = "online_gallery"


def load_user_bookmarked_gallery_item_ids(user_id: int) -> list[int]:
    if not is_supabase_configured():
        return []
    try:
        bookmarks = list_user_bookmarks(user_id, item_type=BOOKMARK_ITEM_TYPE_ONLINE_GALLERY)
    except SupabaseConfigError:
        return []
    except Exception:
        return []
    item_ids: list[int] = []
    for bookmark in bookmarks:
        try:
            item_ids.append(int(bookmark.get("item_id")))
        except (TypeError, ValueError):
            continue
    return item_ids


def load_user_account_dashboard(user_id: int) -> dict[str, Any]:
    dashboard = {
        "bookmarked_items": [],
        "tour_bookings": [],
        "participation_submissions": [],
        "visitor_feedback": [],
        "heritage_keeper": empty_heritage_keeper_progress(),
    }
    if not is_supabase_configured():
        return dashboard

    bookmarked_ids = set(load_user_bookmarked_gallery_item_ids(user_id))
    gallery_items = load_public_online_gallery_items()
    dashboard["bookmarked_items"] = [item for item in gallery_items if int(item.get("id") or 0) in bookmarked_ids]
    dashboard["tour_bookings"] = load_user_tour_bookings(user_id)

    try:
        dashboard["participation_submissions"] = list_participation_submissions_for_user(user_id)
    except Exception:
        dashboard["participation_submissions"] = []

    try:
        dashboard["visitor_feedback"] = list_visitor_feedback_for_user(user_id)
    except Exception:
        dashboard["visitor_feedback"] = []

    dashboard["protected_edu_resources_count"] = len(load_public_edu_resources())
    dashboard["heritage_keeper"] = load_heritage_keeper_progress(user_id)
    return dashboard
