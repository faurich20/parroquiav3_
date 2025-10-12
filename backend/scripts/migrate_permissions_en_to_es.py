# Uso: python scripts/migrate_permissions_en_to_es.py
# Traduce permisos almacenados en inglés a los nuevos ids en español
# Afecta tablas: users.permissions (JSON) y roles.permissions (JSON)

from app import create_app, db
from app.models import User, Role

MAP = {
    'dashboard': 'menu_principal',
    'security': 'seguridad',
    'personal': 'personal',
    'liturgical': 'liturgico',
    'accounting': 'contabilidad',
    'sales': 'ventas',
    'purchases': 'compras',
    'warehouse': 'almacen',
    'configuration': 'configuracion',
    'reports': 'reportes',
}


def translate_list(perms):
    if not isinstance(perms, list):
        return perms
    out = []
    for p in perms:
        out.append(MAP.get(p, p))
    # quitar duplicados manteniendo orden
    seen = set()
    dedup = []
    for p in out:
        if p not in seen:
            dedup.append(p)
            seen.add(p)
    return dedup


def main():
    app = create_app()
    with app.app_context():
        users_updated = 0
        roles_updated = 0

        # Migrar usuarios
        for u in User.query.all():
            old = u.permissions or []
            new = translate_list(old)
            if new != old:
                u.permissions = new
                users_updated += 1
        # Migrar roles
        for r in Role.query.all():
            old = r.permissions or []
            new = translate_list(old)
            if new != old:
                r.permissions = new
                roles_updated += 1
        db.session.commit()
        print(f"Usuarios actualizados: {users_updated}")
        print(f"Roles actualizados: {roles_updated}")
        if users_updated == 0 and roles_updated == 0:
            print("No se encontraron permisos en inglés para migrar.")


if __name__ == '__main__':
    main()
