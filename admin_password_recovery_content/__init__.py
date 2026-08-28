def register_admin_password_recovery_routes(*args, **kwargs):
    # Keep package discovery lightweight; Flask is imported only when the
    # application actually registers the recovery endpoints.
    from .routes import register_admin_password_recovery_routes as register_routes

    return register_routes(*args, **kwargs)

__all__ = ["register_admin_password_recovery_routes"]
