from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_

import traceback
from app import db
from app.models import User, Role, UserPreferences, Persona
from datetime import datetime
from app.constants import PERMISOS
from app.utils.security import is_valid_email, is_strong_password

users_bp = Blueprint('users', __name__)


@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    try:
        # Obtener parámetros de paginación y búsqueda
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        search = request.args.get('search', '')
        
        # Construir query base
        query = User.query
        
        # Aplicar búsqueda si existe
        if search:
            query = query.filter(
                or_(
                    User.name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%')
                )
            )
        
        # Paginación
        users = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Formatear respuesta
        users_data = [user.to_dict() for user in users.items]
        
        return jsonify({
            'users': users_data,
            'total': users.total,
            'pages': users.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        print(f"Error obteniendo usuarios: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    
@users_bp.route('', methods=['POST'])
@jwt_required()
def create_user():
    try:
        current_user_id = int(get_jwt_identity())  # 🔧 casteo a int
        print(f"📝 Creando nuevo usuario - Solicitado por usuario ID: {current_user_id}")
        
        # Debug: verificar que la solicitud llega
        print(f"📨 Método: {request.method}")
        print(f"📦 Headers: {dict(request.headers)}")
        print(f"🔗 Content-Type: {request.content_type}")
        
        data = request.get_json()
        print(f"📊 Datos recibidos: {data}")
        
        if not data:
            print("❌ No se recibieron datos JSON")
            return jsonify({'error': 'Datos JSON requeridos'}), 400
        
        # Validaciones
        required_fields = ['name', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                print(f"❌ Campo faltante: {field}")
                return jsonify({'error': f'El campo {field} es requerido'}), 400
        
        name = data['name'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        role = data['role'].strip()
        
        print(f"✅ Campos validados: name={name}, email={email}, role={role}")
        
        # Validar email
        if not is_valid_email(email):
            print(f"❌ Email inválido: {email}")
            return jsonify({'error': 'Formato de email inválido'}), 400
        
        # Validar contraseña
        is_strong, message = is_strong_password(password)
        if not is_strong:
            print(f"❌ Contraseña débil: {message}")
            return jsonify({'error': message}), 400
        
        # Verificar si el email ya existe
        if User.query.filter_by(email=email).first():
            print(f"❌ Email ya existe: {email}")
            return jsonify({'error': 'El email ya está registrado'}), 409
        
        # Validar rol contra la tabla roles (dinámico)
        role_row = Role.query.filter_by(name=role).first()
        if not role_row:
            print(f"❌ Rol inexistente en catálogo: {role}")
            return jsonify({'error': 'Rol no válido. Debe existir en el catálogo de roles'}), 400
        
        # Crear nuevo usuario
        new_user = User(
            name=name,
            email=email,
            role=role,
            is_active=data.get('status', 'Activo') == 'Activo'
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.flush()

        # Crear Persona si viene en el payload
        persona_data = data.get('persona') or {}
        if persona_data:
            # Validar campos requeridos según modelo
            required_persona = ['per_nombres', 'per_apellidos', 'fecha_nacimiento', 'parroquiaid']
            missing = [k for k in required_persona if not persona_data.get(k)]
            if missing:
                db.session.rollback()
                return jsonify({'error': f'Faltan campos de persona: {", ".join(missing)}'}), 400

            try:
                fecha_nac = persona_data.get('fecha_nacimiento')
                if isinstance(fecha_nac, str):
                    # Esperamos formato ISO YYYY-MM-DD
                    fecha_nac = datetime.fromisoformat(fecha_nac).date()
                nueva_persona = Persona(
                    userid=new_user.id,
                    per_nombres=persona_data.get('per_nombres', '').strip(),
                    per_apellidos=persona_data.get('per_apellidos', '').strip(),
                    per_domicilio=(persona_data.get('per_domicilio') or '').strip() or None,
                    per_telefono=(persona_data.get('per_telefono') or '').strip() or None,
                    fecha_nacimiento=fecha_nac,
                    parroquiaid=int(persona_data.get('parroquiaid'))
                )
                db.session.add(nueva_persona)
            except Exception as pe:
                db.session.rollback()
                return jsonify({'error': f'Error creando persona: {str(pe)}'}), 400

        db.session.commit()
        
        print(f"✅ Usuario creado exitosamente: {new_user.email} (ID: {new_user.id})")
        
        # Incluir persona en la respuesta si existe
        persona_row = Persona.query.filter_by(userid=new_user.id).first()
        user_payload = new_user.to_dict()
        if persona_row:
            user_payload['persona'] = persona_row.to_dict()

        return jsonify({
            'message': 'Usuario creado exitosamente',
            'user': user_payload
        }), 201
        
    except Exception as e:
        print(f"❌ Error creando usuario: {str(e)}")
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    
@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        current_user_id = int(get_jwt_identity())  # 🔧 casteo a int
        print(f"✏️ Editando usuario ID: {user_id} - Solicitado por: {current_user_id}")
        
        data = request.get_json()
        print(f"📦 Datos de edición: {data}")
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Actualizar campos
        if 'name' in data:
            user.name = data['name'].strip()
        if 'email' in data:
            new_email = data['email'].strip().lower()
            if new_email != user.email and User.query.filter_by(email=new_email).first():
                return jsonify({'error': 'El email ya está en uso'}), 409
            user.email = new_email
        if 'role' in data:
            new_role_name = data['role'].strip()
            # Validar dinámicamente contra catálogo
            role_row = Role.query.filter_by(name=new_role_name).first()
            if not role_row:
                return jsonify({'error': 'Rol no válido. Debe existir en el catálogo de roles'}), 400
            user.role = new_role_name
        # Ignorar cambios directos de permisos de usuario (permisos se derivan del rol)
        if 'status' in data:
            user.is_active = data['status'] == 'Activo'
        
        # Actualizar/crear Persona si viene en el payload
        if 'persona' in data:
            persona_data = data.get('persona') or {}
            if persona_data:
                # Buscar persona existente
                persona_row = Persona.query.filter_by(userid=user.id).first()
                try:
                    if 'per_nombres' in persona_data:
                        persona_row = persona_row or Persona(userid=user.id, per_nombres='', per_apellidos='', fecha_nacimiento=datetime.utcnow().date(), parroquiaid=0)
                        persona_row.per_nombres = persona_data.get('per_nombres', '').strip()
                    if 'per_apellidos' in persona_data:
                        persona_row = persona_row or Persona(userid=user.id, per_nombres=user.name, per_apellidos='', fecha_nacimiento=datetime.utcnow().date(), parroquiaid=0)
                        persona_row.per_apellidos = persona_data.get('per_apellidos', '').strip()
                    if 'per_domicilio' in persona_data:
                        persona_row = persona_row or Persona(userid=user.id, per_nombres=user.name, per_apellidos='', fecha_nacimiento=datetime.utcnow().date(), parroquiaid=0)
                        persona_row.per_domicilio = (persona_data.get('per_domicilio') or '').strip() or None
                    if 'per_telefono' in persona_data:
                        persona_row = persona_row or Persona(userid=user.id, per_nombres=user.name, per_apellidos='', fecha_nacimiento=datetime.utcnow().date(), parroquiaid=0)
                        persona_row.per_telefono = (persona_data.get('per_telefono') or '').strip() or None
                    if 'fecha_nacimiento' in persona_data and persona_data.get('fecha_nacimiento'):
                        persona_row = persona_row or Persona(userid=user.id, per_nombres=user.name, per_apellidos='', fecha_nacimiento=datetime.utcnow().date(), parroquiaid=0)
                        fecha_nac = persona_data.get('fecha_nacimiento')
                        if isinstance(fecha_nac, str):
                            fecha_nac = datetime.fromisoformat(fecha_nac).date()
                        persona_row.fecha_nacimiento = fecha_nac
                    if 'parroquiaid' in persona_data and persona_data.get('parroquiaid') is not None:
                        persona_row = persona_row or Persona(userid=user.id, per_nombres=user.name, per_apellidos='', fecha_nacimiento=datetime.utcnow().date(), parroquiaid=0)
                        persona_row.parroquiaid = int(persona_data.get('parroquiaid'))
                    if persona_row and not persona_row.userid:
                        persona_row.userid = user.id
                    if persona_row and not Persona.query.filter_by(userid=user.id).first():
                        db.session.add(persona_row)
                except Exception as pe:
                    return jsonify({'error': f'Error actualizando persona: {str(pe)}'}), 400

        # Actualizar contraseña si se proporciona
        if 'password' in data and data['password']:
            is_strong, message = is_strong_password(data['password'])
            if not is_strong:
                return jsonify({'error': message}), 400
            user.set_password(data['password'])
        
        db.session.commit()
        
        print(f"✅ Usuario actualizado: {user.email}")
        persona_row = Persona.query.filter_by(userid=user.id).first()
        user_payload = user.to_dict()
        if persona_row:
            user_payload['persona'] = persona_row.to_dict()

        return jsonify({
            'message': 'Usuario actualizado exitosamente',
            'user': user_payload
        }), 200
        
    except Exception as e:
        print(f"❌ Error actualizando usuario: {str(e)}")
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500  

@users_bp.route('/<int:user_id>/status', methods=['PUT'])
@jwt_required()
def update_user_status(user_id):
    try:
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({'error': 'Estado es requerido'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Validar estado
        if data['status'] not in ['Activo', 'Inactivo']:
            return jsonify({'error': 'Estado debe ser "Activo" o "Inactivo"'}), 400
        
        user.is_active = (data['status'] == 'Activo')
        db.session.commit()
        
        return jsonify({
            'message': 'Estado actualizado correctamente',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Error actualizando estado: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
    

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # No permitir eliminar el propio usuario
        current_user_id = int(get_jwt_identity())  # 🔧 casteo a int
        if user.id == current_user_id:
            return jsonify({'error': 'No puedes eliminar tu propio usuario'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuario eliminado correctamente'
        }), 200
        
    except Exception as e:
        print(f"Error eliminando usuario: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())  # 🔧 casteo a int y eliminado duplicado
        print(f"🪪 Identity recibido en /profile: {user_id} ({type(user_id)})")
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        # Incluir preferencias (si existen)
        prefs = UserPreferences.query.get(user_id)
        user_dict = user.to_dict()
        user_dict['preferences'] = prefs.to_dict() if prefs else {}
        return jsonify({'user': user_dict}), 200
        
    except Exception as e:
        print(f"Error obteniendo perfil: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())  # 🔧 casteo a int
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            user.name = data['name'].strip()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Perfil actualizado exitosamente',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Error actualizando perfil: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
    
@users_bp.route('/check-email', methods=['GET'])
@jwt_required()
def check_email():
    email = request.args.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email requerido'}), 400
    
    exists = User.query.filter_by(email=email).first() is not None
    return jsonify({'exists': exists}), 200


@users_bp.route('/me/preferences', methods=['PATCH'])
@jwt_required()
def patch_preferences():
    try:
        user_id = int(get_jwt_identity())
        patch = request.get_json(silent=True) or {}
        if not isinstance(patch, dict):
            return jsonify({'error': 'Formato inválido'}), 400

        prefs = UserPreferences.query.get(user_id)
        if not prefs:
            prefs = UserPreferences(user_id=user_id, data={})
            db.session.add(prefs)

        # Merge superficial de JSON
        prefs.data = { **(prefs.data or {}), **patch }
        db.session.commit()
        return jsonify({ 'success': True, 'preferences': prefs.data }), 200
    except Exception as e:
        print(f"Error actualizando preferencias: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
