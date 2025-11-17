from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt

# Carga perezosa para evitar ciclos de import
def _load_models():
    from app.models import User, Role  # type: ignore
    return User, Role


def _get_permissions_from_claims_or_db():
    """Obtiene permisos del claim 'perms' si existe; si no, resuelve desde BD por rol."""
    try:
        jwt_data = get_jwt()
        perms = jwt_data.get('perms') if isinstance(jwt_data, dict) else None
        if isinstance(perms, list):
            return perms
    except Exception:
        perms = None

    # Fallback a BD
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return []
        User, Role = _load_models()
        user = User.query.get(int(user_id))
        if not user or not user.role:
            return []
        role_row = Role.query.filter_by(name=user.role).first()
        return (role_row.permissions or []) if role_row and role_row.permissions else []
    except Exception:
        return []


def permission_required(*required_permissions):
    """
    Decorador para exigir uno o varios permisos.
    - Lee permisos desde el JWT (claim 'perms') si está presente.
    - Si no, resuelve permisos efectivos del usuario a partir del rol en la BD.
    - Retorna 403 si ninguno de los permisos requeridos está presente.
    """

    # Normalizar la lista de permisos requeridos
    required = []
    for rp in required_permissions:
        if not rp:
            continue
        if isinstance(rp, (list, tuple, set)):
            required.extend([str(x) for x in rp if x])
        else:
            required.append(str(rp))

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            perms = _get_permissions_from_claims_or_db()
            if required:
                if not any(req in perms for req in required):
                    msg = (
                        f"Permiso requerido: {required[0]}"
                        if len(required) == 1
                        else f"Uno de: {', '.join(required)}"
                    )
                    return (
                        jsonify({
                            'error': 'Forbidden',
                            'message': msg,
                        }),
                        403,
                    )
            return fn(*args, **kwargs)
        return wrapper

    return decorator


def has_permission(required_permission):
    """Helper reutilizable (p. ej., en before_request)."""
    perms = _get_permissions_from_claims_or_db()
    return required_permission in perms
