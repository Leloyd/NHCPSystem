from .routes import register_edu_resources_routes
from .service import EDU_RESOURCES_UPLOAD_DIR, load_admin_edu_resource, load_admin_edu_resources, load_public_edu_resources

__all__ = [
    "EDU_RESOURCES_UPLOAD_DIR",
    "load_admin_edu_resource",
    "load_admin_edu_resources",
    "load_public_edu_resources",
    "register_edu_resources_routes",
]
