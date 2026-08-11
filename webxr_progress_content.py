from __future__ import annotations

from typing import Any

from webxr_progress_repository import deposit_webxr_items, list_webxr_items, upsert_webxr_item


WEBXR_RECORDS = {
    "pransiskano": ("Nagcarlan and the Franciscan Missions", "Nagcarlan at ang mga Misyong Pransiskano"),
    "pagkasira": ("Deterioration", "Pagkasira"),
    "pagsaayos": ("Cycles of Restoration", "Mga Yugto ng Pagsasaayos"),
}

WEBXR_COLLECTIBLES: dict[str, dict[str, str]] = {
    "franciscan-document-1": {"record": "pransiskano", "title_en": "Franciscan document I", "title_tl": "Dokumentong Pransiskano I", "asset": "/images/landing/Juan1.png", "kind": "document"},
    "franciscan-document-2": {"record": "pransiskano", "title_en": "Franciscan document II", "title_tl": "Dokumentong Pransiskano II", "asset": "/images/landing/Juan2.png", "kind": "document"},
    "franciscan-document-3": {"record": "pransiskano", "title_en": "Franciscan document III", "title_tl": "Dokumentong Pransiskano III", "asset": "/images/landing/Juan3.png", "kind": "document"},
    "franciscan-document-4": {"record": "pransiskano", "title_en": "Franciscan document IV", "title_tl": "Dokumentong Pransiskano IV", "asset": "/images/landing/Juan4.png", "kind": "document"},
    "deterioration-1911": {"record": "pagkasira", "title_en": "Chapel facade, 1911", "title_tl": "Harap ng kapilya, 1911", "asset": "/images/heritage-albums/1911_2.png", "kind": "image"},
    "deterioration-ceiling": {"record": "pagkasira", "title_en": "Faded ceiling paint", "title_tl": "Kumupas na pintura ng kisame", "asset": "/images/heritage-albums/1982_1.png", "kind": "image"},
    "deterioration-wood": {"record": "pagkasira", "title_en": "Rotting historic wood", "title_tl": "Nabubulok na makasaysayang kahoy", "asset": "/images/heritage-albums/1983_1.png", "kind": "image"},
    "deterioration-cracks": {"record": "pagkasira", "title_en": "Cracks in the masonry", "title_tl": "Mga bitak sa masonriya", "asset": "/images/heritage-albums/2000_7.png", "kind": "image"},
    "restoration-first-campaign": {"record": "pagsaayos", "title_en": "First restoration campaign", "title_tl": "Unang kampanya ng pagsasaayos", "asset": "/images/heritage-albums/1982-1981_2.png", "kind": "image"},
    "restoration-2008": {"record": "pagsaayos", "title_en": "Chapel restoration, 2008", "title_tl": "Pagsasaayos ng kapilya, 2008", "asset": "/images/heritage-albums/PebOk-2008_2.png", "kind": "image"},
    "restoration-2015": {"record": "pagsaayos", "title_en": "Restoration campaign, 2015–2016", "title_tl": "Kampanya ng pagsasaayos, 2015–2016", "asset": "/images/heritage-albums/PebOk-2015-2016_2.png", "kind": "image"},
    "restoration-plaster": {"record": "pagsaayos", "title_en": "Preparing compatible plaster", "title_tl": "Paghahanda ng angkop na palitada", "asset": "/images/heritage-albums/PebOk-2015-2016_8.png", "kind": "image"},
}

VALID_WEBXR_SCENES = {"museum", "church", "underground"}


def _decorate_item(row: dict[str, Any]) -> dict[str, Any] | None:
    key = str(row.get("item_key") or "")
    definition = WEBXR_COLLECTIBLES.get(key)
    if not definition:
        return None
    return {
        "key": key,
        **definition,
        "status": str(row.get("status") or "inventory"),
        "acquired_scene": str(row.get("acquired_scene") or ""),
        "acquired_at": str(row.get("acquired_at") or ""),
        "deposited_at": str(row.get("deposited_at") or ""),
    }


def load_webxr_player_progress(user_id: int) -> dict[str, Any]:
    rows = list_webxr_items(user_id)
    items = [item for item in (_decorate_item(row) for row in rows) if item]
    deposited = {record: 0 for record in WEBXR_RECORDS}
    inventory_count = 0
    for item in items:
        if item["status"] == "deposited":
            deposited[item["record"]] += 1
        else:
            inventory_count += 1
    required = {
        record: sum(1 for item in WEBXR_COLLECTIBLES.values() if item["record"] == record)
        for record in WEBXR_RECORDS
    }
    return {
        "items": items,
        "inventory_count": inventory_count,
        "records": {
            record: {
                "count": deposited[record],
                "required": required[record],
                "complete": deposited[record] >= required[record],
                "title_en": labels[0],
                "title_tl": labels[1],
            }
            for record, labels in WEBXR_RECORDS.items()
        },
    }


def collect_webxr_item(user_id: int, item_key: str, scene: str) -> dict[str, Any]:
    key = str(item_key or "").strip().lower()
    normalized_scene = str(scene or "").strip().lower()
    if key not in WEBXR_COLLECTIBLES:
        raise ValueError("That recovered item is not recognized.")
    if normalized_scene not in VALID_WEBXR_SCENES:
        raise ValueError("That 3D environment is not recognized.")
    upsert_webxr_item(user_id, key, normalized_scene)
    return load_webxr_player_progress(user_id)


def deposit_webxr_record(user_id: int, record_key: str) -> dict[str, Any]:
    normalized_record = str(record_key or "").strip().lower()
    if normalized_record not in WEBXR_RECORDS:
        raise ValueError("That chapel record is not recognized.")
    keys = [key for key, item in WEBXR_COLLECTIBLES.items() if item["record"] == normalized_record]
    deposit_webxr_items(user_id, keys)
    return load_webxr_player_progress(user_id)
