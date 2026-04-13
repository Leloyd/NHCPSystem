from .routes import register_community_content_routes
from .service import COMMUNITY_EVENTS_UPLOAD_DIR, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR, COMMUNITY_HIGHLIGHT_CATEGORIES

__all__ = [
    "COMMUNITY_EVENTS_UPLOAD_DIR",
    "COMMUNITY_HIGHLIGHTS_UPLOAD_DIR",
    "COMMUNITY_HIGHLIGHT_CATEGORIES",
    "register_community_content_routes",
]
