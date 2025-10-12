from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Role, User
from app.constants import PERMISOS

roles_bp = Blueprint('roles', __name__)

@roles_bp.route('', methods=['GET'])
@jwt_required()
def list_roles():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        search = request.args.get('search', '', type=str).strip()

        query = Role.query
        if search:
            like = f"%{search}%"
            query = query.filter(Role.name.ilike(like))

        pagination = query.order_by(Role.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
        data = [r.to_dict() for r in pagination.items]

        return jsonify({
            'roles': data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
    except Exception as e:
        print(f"Error listando roles: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@roles_bp.route('/sync', methods=['POST'])
@jwt_required()
def sync_roles_from_users():
    try:
        # Obtener roles distintos de usuarios
        distinct_roles = [r[0] for r in db.session.query(User.role).distinct().all() if r[0]]
        created = []
        for name in distinct_roles:
            exists = Role.query.filter_by(name=name).first()
            if not exists:
                new_role = Role(name=name, description='', permissions=[], is_active=True)
                db.session.add(new_role)
                created.append(name)
        if created:
            db.session.commit()
        return jsonify({'message': 'Sync completado', 'created': created}), 200
    except Exception as e:
        print(f"Error sincronizando roles: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@roles_bp.route('', methods=['POST'])
@jwt_required()
def create_role():
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        description = (data.get('description') or '').strip()
        permissions = data.get('permissions') or []
        status = data.get('status') or 'Activo'

        if not name:
            return jsonify({'error': 'El nombre es requerido'}), 400

        # nombre único
        if Role.query.filter_by(name=name).first():
            return jsonify({'error': 'El nombre del rol ya existe'}), 409

        # Validar permisos contra catálogo
        permissions = [p for p in permissions if p in PERMISOS]

        new_role = Role(
            name=name,
            description=description,
            permissions=permissions,
            is_active=(status == 'Activo')
        )
        db.session.add(new_role)
        db.session.commit()
        return jsonify({'message': 'Rol creado', 'role': new_role.to_dict()}), 201
    except Exception as e:
        print(f"Error creando rol: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@roles_bp.route('/<int:role_id>', methods=['PUT'])
@jwt_required()
def update_role(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'error': 'Rol no encontrado'}), 404

        data = request.get_json() or {}

        if 'name' in data:
            name = (data.get('name') or '').strip()
            if not name:
                return jsonify({'error': 'El nombre es requerido'}), 400
            # validar único si cambia
            if name != role.name and Role.query.filter_by(name=name).first():
                return jsonify({'error': 'El nombre del rol ya existe'}), 409
            # Propagar cambio de nombre a usuarios con el nombre anterior
            if name != role.name:
                old_name = role.name
                role.name = name
                # Actualizar usuarios que tenían el rol anterior
                db.session.query(User).filter_by(role=old_name).update({User.role: name})

        if 'description' in data:
            role.description = (data.get('description') or '').strip()

        if 'permissions' in data:
            incoming = data.get('permissions') or []
            # Validar contra catálogo
            role.permissions = [p for p in incoming if p in PERMISOS]

        if 'status' in data:
            role.is_active = (data.get('status') == 'Activo')

        db.session.commit()
        return jsonify({'message': 'Rol actualizado', 'role': role.to_dict()}), 200
    except Exception as e:
        print(f"Error actualizando rol: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@roles_bp.route('/<int:role_id>', methods=['DELETE'])
@jwt_required()
def delete_role(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'error': 'Rol no encontrado'}), 404

        db.session.delete(role)
        db.session.commit()
        return jsonify({'message': 'Rol eliminado'}), 200
    except Exception as e:
        print(f"Error eliminando rol: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@roles_bp.route('/<int:role_id>/status', methods=['PUT'])
@jwt_required()
def update_role_status(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'error': 'Rol no encontrado'}), 404

        data = request.get_json() or {}
        status = data.get('status')
        if status not in ['Activo', 'Inactivo']:
            return jsonify({'error': 'Estado debe ser "Activo" o "Inactivo"'}), 400

        role.is_active = (status == 'Activo')
        db.session.commit()
        return jsonify({'message': 'Estado actualizado', 'role': role.to_dict()}), 200
    except Exception as e:
        print(f"Error actualizando estado de rol: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
