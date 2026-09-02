from __future__ import annotations

import math
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

WEBXR_ENVIRONMENTS = {
    "museum": ("Museum Gallery", "Galeriya ng Museo"),
    "church": ("Chapel Investigation", "Pagsisiyasat sa Kapilya"),
    "underground": ("Underground Memory", "Alaala sa Ilalim ng Lupa"),
}

TRAIL_REQUIRED = len(TRAIL_FRAGMENTS)
AR_KEY_ORDER = list(AR_ARTIFACTS)
AR_REQUIRED = len(AR_KEY_ORDER)
WEBXR_KEY_ORDER = list(WEBXR_ENVIRONMENTS)
WEBXR_REQUIRED = len(WEBXR_KEY_ORDER)
TOTAL_REQUIRED = TRAIL_REQUIRED + AR_REQUIRED + WEBXR_REQUIRED
MASTER_PIECE_REQUIRED = 12
VALID_TRAIL_KEYS = {item[0] for item in TRAIL_FRAGMENTS}
TRAIL_KEY_ORDER = [item[0] for item in TRAIL_FRAGMENTS]
# These stops may be passed without completing their activities. They remain
# required for a complete Trail restoration plate, but they do not prevent a
# later completed stop from being recorded.
ACTIVITY_GATED_TRAIL_KEYS = {"stop4", "stop9"}
VALID_AR_KEYS = set(AR_ARTIFACTS)
VALID_WEBXR_KEYS = set(WEBXR_ENVIRONMENTS)


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
    fragments.extend(
        {
            "number": TRAIL_REQUIRED + AR_REQUIRED + index + 1,
            "source": "webxr",
            "key": key,
            "label_en": WEBXR_ENVIRONMENTS[key][0],
            "label_tl": WEBXR_ENVIRONMENTS[key][1],
            "earned": False,
        }
        for index, key in enumerate(WEBXR_KEY_ORDER)
    )
    return {
        "available": is_supabase_configured(),
        "trail_count": 0,
        "trail_required": TRAIL_REQUIRED,
        "ar_count": 0,
        "ar_total_restored": 0,
        "ar_required": AR_REQUIRED,
        "webxr_count": 0,
        "webxr_required": WEBXR_REQUIRED,
        "total_count": 0,
        "total_required": TOTAL_REQUIRED,
        "percentage": 0,
        "master_piece_count": 0,
        "master_piece_required": MASTER_PIECE_REQUIRED,
        "master_fragments": [False] * MASTER_PIECE_REQUIRED,
        "trail_complete": False,
        "ar_complete": False,
        "webxr_complete": False,
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
    webxr_keys = {
        str(event.get("item_key") or "")
        for event in events
        if event.get("source") == "webxr" and event.get("item_key") in VALID_WEBXR_KEYS
    }
    for index, key in enumerate(WEBXR_KEY_ORDER):
        labels = WEBXR_ENVIRONMENTS[key]
        fragments.append({
            "number": TRAIL_REQUIRED + AR_REQUIRED + index + 1,
            "source": "webxr",
            "key": key,
            "label_en": labels[0],
            "label_tl": labels[1],
            "earned": key in webxr_keys,
        })

    trail_count = len(trail_keys)
    ar_count = len(earned_ar_keys)
    webxr_count = len(webxr_keys)
    total_count = trail_count + ar_count + webxr_count
    trail_complete = trail_count >= TRAIL_REQUIRED
    ar_complete = ar_count >= AR_REQUIRED
    webxr_complete = webxr_count >= WEBXR_REQUIRED
    all_plates_complete = trail_complete and ar_complete and webxr_complete
    normalized_plate_progress = (
        (trail_count / TRAIL_REQUIRED)
        + (ar_count / AR_REQUIRED)
        + (webxr_count / WEBXR_REQUIRED)
    ) / 3
    master_piece_count = (
        MASTER_PIECE_REQUIRED
        if all_plates_complete
        else min(
            MASTER_PIECE_REQUIRED - 1,
            math.ceil(normalized_plate_progress * MASTER_PIECE_REQUIRED),
        )
    ) if total_count else 0
    progress.update({
        "trail_count": trail_count,
        "ar_count": ar_count,
        "ar_total_restored": len(ar_keys),
        "webxr_count": webxr_count,
        "total_count": total_count,
        "percentage": round((total_count / TOTAL_REQUIRED) * 100),
        "master_piece_count": master_piece_count,
        "master_fragments": [index < master_piece_count for index in range(MASTER_PIECE_REQUIRED)],
        "trail_complete": trail_complete,
        "ar_complete": ar_complete,
        "webxr_complete": webxr_complete,
        "unlocked": bool(award) and trail_complete and ar_complete and webxr_complete,
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
    valid_keys = (
        VALID_TRAIL_KEYS if normalized_source == "trail"
        else VALID_AR_KEYS if normalized_source == "ar"
        else VALID_WEBXR_KEYS if normalized_source == "webxr"
        else set()
    )
    if normalized_key not in valid_keys:
        raise ValueError("That Heritage Keeper fragment is not recognized.")

    events_before = list_heritage_keeper_events(user_id)
    identity = (normalized_source, normalized_key)
    existing = {(str(item.get("source") or ""), str(item.get("item_key") or "")) for item in events_before}
    if normalized_source == "trail":
        target_index = TRAIL_KEY_ORDER.index(normalized_key)
        required_previous = set(TRAIL_KEY_ORDER[:target_index]) - ACTIVITY_GATED_TRAIL_KEYS
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
    if progress["trail_complete"] and progress["ar_complete"] and progress["webxr_complete"] and not award_before:
        try:
            create_heritage_keeper_award(user_id)
            award_just_unlocked = True
        except Exception:
            pass
        progress = _build_progress(events_after, get_heritage_keeper_award(user_id))
    elif progress["trail_complete"] and progress["ar_complete"] and progress["webxr_complete"]:
        award_just_unlocked = not (
            progress_before["trail_complete"]
            and progress_before["ar_complete"]
            and progress_before["webxr_complete"]
        )

    return {
        "new_fragment": newly_awarded,
        "award_just_unlocked": award_just_unlocked,
        "progress": progress,
    }
