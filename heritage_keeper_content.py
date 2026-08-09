from __future__ import annotations

from typing import Any

from heritage_keeper_repository import (
    create_heritage_keeper_award,
    create_heritage_keeper_event,
    get_heritage_keeper_award,
    list_heritage_keeper_events,
)
from supabase_client import is_supabase_configured


TRAIL_FRAGMENTS = (
    ("stop1", "Front Gate", "Harapang Tarangkahan"),
    ("stop2", "Museum Grounds", "Bakuran ng Museo"),
    ("stop3", "Inside the Museum", "Loob ng Museo"),
    ("stop4", "Playful Checkpoint", "Masayang Himpilan"),
    ("stop5", "Cemetery History", "Kasaysayan ng Sementeryo"),
    ("stop6", "Front of the Chapel", "Harap ng Kapilya"),
    ("stop7", "Inside the Chapel", "Loob ng Kapilya"),
    ("stop8", "Underground Crypts", "Mga Kripta sa Ilalim"),
    ("stop9", "Keeper's Archive", "Arkibo ng Tagapangalaga"),
    ("stop10", "Journey's End", "Wakas ng Paglalakbay"),
)

AR_ARTIFACTS = {
    "balanghay": ("Balanghay", "Balanghay"),
    "kabaong": ("Hanging Coffin", "Nakabiting Kabaong"),
    "banga": ("Manunggul Jar", "Banga ng Manunggul"),
    "jar": ("Maitum Jar", "Banga ng Maitum"),
    "bogwa": ("Bogwa", "Bogwa"),
    "alay": ("Alay", "Alay"),
    "antuk": ("Antuk", "Antuk"),
    "bagongon": ("Bagongon", "Bagongon"),
    "pagpag": ("Pagpag", "Pagpag"),
    "pahimakas": ("Pahimakas", "Pahimakas"),
    "uloh": ("Uloh", "Uloh"),
    "tsapang": ("Tsapang", "Tsapang"),
    "kagamitan": ("Funerary Objects", "Kagamitang Panlibing"),
    "luksa": ("Luksa", "Luksa"),
    "pagtubas": ("Pagtubas", "Pagtubas"),
    "pahiwatig": ("Pahiwatig", "Pahiwatig"),
    "recuerdos": ("Recuerdos", "Recuerdos"),
    "sabwag": ("Sabwag", "Sabwag"),
    "sisiw": ("Sisiw", "Sisiw"),
    "tausug": ("Tausug Burial Tradition", "Tradisyong Panlibing ng Tausug"),
    "tboli": ("T'boli Burial Tradition", "Tradisyong Panlibing ng T'boli"),
}

TRAIL_REQUIRED = len(TRAIL_FRAGMENTS)
AR_KEY_ORDER = list(AR_ARTIFACTS)
AR_REQUIRED = len(AR_KEY_ORDER)
TOTAL_REQUIRED = TRAIL_REQUIRED + AR_REQUIRED
VALID_TRAIL_KEYS = {item[0] for item in TRAIL_FRAGMENTS}
TRAIL_KEY_ORDER = [item[0] for item in TRAIL_FRAGMENTS]
VALID_AR_KEYS = set(AR_ARTIFACTS)


def empty_heritage_keeper_progress() -> dict[str, Any]:
    fragments = [
        {"number": index + 1, "source": "trail", "key": key, "label_en": label_en, "label_tl": label_tl, "earned": False}
        for index, (key, label_en, label_tl) in enumerate(TRAIL_FRAGMENTS)
    ]
    fragments.extend(
        {
            "number": TRAIL_REQUIRED + index + 1,
            "source": "ar",
            "key": key,
            "label_en": AR_ARTIFACTS[key][0],
            "label_tl": AR_ARTIFACTS[key][1],
            "earned": False,
        }
        for index, key in enumerate(AR_KEY_ORDER)
    )
    return {
        "available": is_supabase_configured(),
        "trail_count": 0,
        "trail_required": TRAIL_REQUIRED,
        "ar_count": 0,
        "ar_total_restored": 0,
        "ar_required": AR_REQUIRED,
        "total_count": 0,
        "total_required": TOTAL_REQUIRED,
        "percentage": 0,
        "trail_complete": False,
        "ar_complete": False,
        "unlocked": False,
        "unlocked_at": "",
        "fragments": fragments,
    }


def _build_progress(events: list[dict[str, Any]], award: dict[str, Any] | None) -> dict[str, Any]:
    progress = empty_heritage_keeper_progress()
    trail_keys = {
        str(event.get("item_key") or "")
        for event in events
        if event.get("source") == "trail" and event.get("item_key") in VALID_TRAIL_KEYS
    }
    ar_events = [
        event for event in events
        if event.get("source") == "ar" and event.get("item_key") in VALID_AR_KEYS
    ]
    ar_events.sort(key=lambda item: str(item.get("completed_at") or ""))
    ar_keys: list[str] = []
    for event in ar_events:
        key = str(event.get("item_key") or "")
        if key and key not in ar_keys:
            ar_keys.append(key)

    fragments = []
    for index, (key, label_en, label_tl) in enumerate(TRAIL_FRAGMENTS):
        fragments.append({
            "number": index + 1,
            "source": "trail",
            "key": key,
            "label_en": label_en,
            "label_tl": label_tl,
            "earned": key in trail_keys,
        })
    earned_ar_keys = set(ar_keys)
    for index, key in enumerate(AR_KEY_ORDER):
        labels = AR_ARTIFACTS[key]
        fragments.append({
            "number": TRAIL_REQUIRED + index + 1,
            "source": "ar",
            "key": key,
            "label_en": labels[0],
            "label_tl": labels[1],
            "earned": key in earned_ar_keys,
        })

    trail_count = len(trail_keys)
    ar_count = len(earned_ar_keys)
    total_count = trail_count + ar_count
    trail_complete = trail_count >= TRAIL_REQUIRED
    ar_complete = ar_count >= AR_REQUIRED
    progress.update({
        "trail_count": trail_count,
        "ar_count": ar_count,
        "ar_total_restored": len(ar_keys),
        "total_count": total_count,
        "percentage": round((total_count / TOTAL_REQUIRED) * 100),
        "trail_complete": trail_complete,
        "ar_complete": ar_complete,
        "unlocked": bool(award) and trail_complete and ar_complete,
        "unlocked_at": str((award or {}).get("unlocked_at") or ""),
        "fragments": fragments,
    })
    return progress


def load_heritage_keeper_progress(user_id: int) -> dict[str, Any]:
    if not is_supabase_configured():
        return empty_heritage_keeper_progress()
    try:
        return _build_progress(list_heritage_keeper_events(user_id), get_heritage_keeper_award(user_id))
    except Exception:
        return empty_heritage_keeper_progress()


def record_heritage_keeper_fragment(user_id: int, source: str, item_key: str) -> dict[str, Any]:
    normalized_source = str(source or "").strip().lower()
    normalized_key = str(item_key or "").strip().lower()
    valid_keys = VALID_TRAIL_KEYS if normalized_source == "trail" else VALID_AR_KEYS if normalized_source == "ar" else set()
    if normalized_key not in valid_keys:
        raise ValueError("That Heritage Keeper fragment is not recognized.")

    events_before = list_heritage_keeper_events(user_id)
    identity = (normalized_source, normalized_key)
    existing = {(str(item.get("source") or ""), str(item.get("item_key") or "")) for item in events_before}
    if normalized_source == "trail":
        target_index = TRAIL_KEY_ORDER.index(normalized_key)
        required_previous = set(TRAIL_KEY_ORDER[:target_index])
        earned_trail = {item_key for source_key, item_key in existing if source_key == "trail"}
        if not required_previous.issubset(earned_trail):
            raise ValueError("Complete the preceding Heritage Trail stops first.")
    newly_awarded = identity not in existing
    if newly_awarded:
        try:
            create_heritage_keeper_event(user_id, normalized_source, normalized_key)
        except Exception:
            # The database uniqueness rule makes simultaneous/repeated requests safe.
            pass

    events_after = list_heritage_keeper_events(user_id)
    award_before = get_heritage_keeper_award(user_id)
    progress_before = _build_progress(events_before, award_before)
    progress = _build_progress(events_after, award_before)
    award_just_unlocked = False
    if progress["trail_complete"] and progress["ar_complete"] and not award_before:
        try:
            create_heritage_keeper_award(user_id)
            award_just_unlocked = True
        except Exception:
            pass
        progress = _build_progress(events_after, get_heritage_keeper_award(user_id))
    elif progress["trail_complete"] and progress["ar_complete"]:
        award_just_unlocked = not (
            progress_before["trail_complete"] and progress_before["ar_complete"]
        )

    return {
        "new_fragment": newly_awarded,
        "award_just_unlocked": award_just_unlocked,
        "progress": progress,
    }
