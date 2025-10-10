# from flask import Blueprint, request, jsonify
# from flask_jwt_extended import jwt_required, get_jwt_identity
# from sqlalchemy import or_

# import traceback
# from app import db
# from app.models import User
# from app.utils.security import is_valid_email, is_strong_password

# users_bp = Blueprint('users', __name__)


# @users_bp.route('', methods=['GET'])
# @jwt_required()
# def get_users():
#     try:
#         # Obtener parámetros de paginación y búsqueda
#         page = request.args.get('page', 1, type=int)
#         per_page = request.args.get('per_page', 100, type=int)
#         search = request.args.get('search', '')
        
#         # Construir query base
#         query = User.query
        
#         # Aplicar búsqueda si existe
#         if search:
#             query = query.filter(
#                 or_(
#                     User.name.ilike(f'%{search}%'),
#                     User.email.ilike(f'%{search}%')
#                 )
#             )
        
#         # Paginación
#         users = query.paginate(
#             page=page, 
#             per_page=per_page, 
#             error_out=False
#         )
        
#         # Formatear respuesta
#         users_data = [user.to_dict() for user in users.items]
        
#         return jsonify({
#             'users': users_data,
#             'total': users.total,
#             'pages': users.pages,
#             'current_page': page
#         }), 200
        
#     except Exception as e:
#         print(f"Error obteniendo usuarios: {str(e)}")
#         return jsonify({'error': 'Error interno del servidor'}), 500
    
# @users_bp.route('', methods=['POST'])
# @jwt_required()
# def create_user():
#     try:
#         current_user_id = get_jwt_identity()
#         print(f"📝 Creando nuevo usuario - Solicitado por usuario ID: {current_user_id}")
        
#         # Debug: verificar que la solicitud llega
#         print(f"📨 Método: {request.method}")
#         print(f"📦 Headers: {dict(request.headers)}")
#         print(f"🔗 Content-Type: {request.content_type}")
        
#         data = request.get_json()
#         print(f"📊 Datos recibidos: {data}")
        
#         if not data:
#             print("❌ No se recibieron datos JSON")
#             return jsonify({'error': 'Datos JSON requeridos'}), 400
        
#         # Validaciones
#         required_fields = ['name', 'email', 'password', 'role']
#         for field in required_fields:
#             if field not in data or not str(data[field]).strip():
#                 print(f"❌ Campo faltante: {field}")
#                 return jsonify({'error': f'El campo {field} es requerido'}), 400
        
#         name = data['name'].strip()
#         email = data['email'].strip().lower()
#         password = data['password']
#         role = data['role'].strip()
        
#         print(f"✅ Campos validados: name={name}, email={email}, role={role}")
        
#         # Validar email
#         if not is_valid_email(email):
#             print(f"❌ Email inválido: {email}")
#             return jsonify({'error': 'Formato de email inválido'}), 400
        
#         # Validar contraseña
#         is_strong, message = is_strong_password(password)
#         if not is_strong:
#             print(f"❌ Contraseña débil: {message}")
#             return jsonify({'error': message}), 400
        
#         # Verificar si el email ya existe
#         if User.query.filter_by(email=email).first():
#             print(f"❌ Email ya existe: {email}")
#             return jsonify({'error': 'El email ya está registrado'}), 409
        
#         # Validar rol
#         valid_roles = ['admin', 'secretaria', 'tesorero', 'colaborador', 'user']
#         if role not in valid_roles:
#             print(f"❌ Rol inválido: {role}")
#             return jsonify({'error': f'Rol inválido. Debe ser: {", ".join(valid_roles)}'}), 400
        
#         # Crear nuevo usuario
#         new_user = User(
#             name=name,
#             email=email,
#             role=role,
#             permissions=data.get('permissions', ['dashboard']),
#             is_active=data.get('status', 'Activo') == 'Activo'
#         )
#         new_user.set_password(password)
        
#         db.session.add(new_user)
#         db.session.commit()
        
#         print(f"✅ Usuario creado exitosamente: {new_user.email} (ID: {new_user.id})")
        
#         return jsonify({
#             'message': 'Usuario creado exitosamente',
#             'user': new_user.to_dict()
#         }), 201
        
#     except Exception as e:
#         print(f"❌ Error creando usuario: {str(e)}")
#         print(traceback.format_exc())
#         db.session.rollback()
#         return jsonify({'error': 'Error interno del servidor'}), 500
    
    
# @users_bp.route('/<int:user_id>', methods=['PUT'])
# @jwt_required()
# def update_user(user_id):
#     try:
#         current_user_id = get_jwt_identity()
#         print(f"✏️ Editando usuario ID: {user_id} - Solicitado por: {current_user_id}")
        
#         data = request.get_json()
#         print(f"📦 Datos de edición: {data}")
        
#         user = User.query.get(user_id)
#         if not user:
#             return jsonify({'error': 'Usuario no encontrado'}), 404
        
#         # Actualizar campos
#         if 'name' in data:
#             user.name = data['name'].strip()
#         if 'email' in data:
#             new_email = data['email'].strip().lower()
#             if new_email != user.email and User.query.filter_by(email=new_email).first():
#                 return jsonify({'error': 'El email ya está en uso'}), 409
#             user.email = new_email
#         if 'role' in data:
#             user.role = data['role'].strip()
#         if 'permissions' in data:
#             user.permissions = data['permissions']
#         if 'status' in data:
#             user.is_active = data['status'] == 'Activo'
        
#         # Actualizar contraseña si se proporciona
#         if 'password' in data and data['password']:
#             is_strong, message = is_strong_password(data['password'])
#             if not is_strong:
#                 return jsonify({'error': message}), 400
#             user.set_password(data['password'])
        
#         db.session.commit()
        
#         print(f"✅ Usuario actualizado: {user.email}")
#         return jsonify({
#             'message': 'Usuario actualizado exitosamente',
#             'user': user.to_dict()
#         }), 200
        
#     except Exception as e:
#         print(f"❌ Error actualizando usuario: {str(e)}")
#         print(traceback.format_exc())
#         db.session.rollback()
#         return jsonify({'error': 'Error interno del servidor'}), 500  

# @users_bp.route('/<int:user_id>/status', methods=['PUT'])
# @jwt_required()
# def update_user_status(user_id):
#     try:
#         data = request.get_json()
        
#         if not data or 'status' not in data:
#             return jsonify({'error': 'Estado es requerido'}), 400
        
#         user = User.query.get(user_id)
#         if not user:
#             return jsonify({'error': 'Usuario no encontrado'}), 404
        
#         # Validar estado
#         if data['status'] not in ['Activo', 'Inactivo']:
#             return jsonify({'error': 'Estado debe ser "Activo" o "Inactivo"'}), 400
        
#         user.is_active = (data['status'] == 'Activo')
#         db.session.commit()
        
#         return jsonify({
#             'message': 'Estado actualizado correctamente',
#             'user': user.to_dict()
#         }), 200
        
#     except Exception as e:
#         print(f"Error actualizando estado: {str(e)}")
#         db.session.rollback()
#         return jsonify({'error': 'Error interno del servidor'}), 500
    

# @users_bp.route('/<int:user_id>', methods=['DELETE'])
# @jwt_required()
# def delete_user(user_id):
#     try:
#         user = User.query.get(user_id)
#         if not user:
#             return jsonify({'error': 'Usuario no encontrado'}), 404
        
#         # No permitir eliminar el propio usuario
#         current_user_id = get_jwt_identity()
#         if user.id == current_user_id:
#             return jsonify({'error': 'No puedes eliminar tu propio usuario'}), 400
        
#         db.session.delete(user)
#         db.session.commit()
        
#         return jsonify({
#             'message': 'Usuario eliminado correctamente'
#         }), 200
        
#     except Exception as e:
#         print(f"Error eliminando usuario: {str(e)}")
#         db.session.rollback()
#         return jsonify({'error': 'Error interno del servidor'}), 500

# @users_bp.route('/profile', methods=['GET'])
# @jwt_required()
# def get_profile():
#     try:
#         user_id = get_jwt_identity()
#         user_id = get_jwt_identity()
#         print(f"🪪 Identity recibido en /profile: {user_id} ({type(user_id)})")
#         user = User.query.get(user_id)
        
#         if not user:
#             return jsonify({'error': 'Usuario no encontrado'}), 404
        
#         return jsonify({'user': user.to_dict()}), 200
        
#     except Exception as e:
#         print(f"Error obteniendo perfil: {str(e)}")
#         return jsonify({'error': 'Error interno del servidor'}), 500

# @users_bp.route('/profile', methods=['PUT'])
# @jwt_required()
# def update_profile():
#     try:
#         user_id = get_jwt_identity()
#         user = User.query.get(user_id)
        
#         if not user:
#             return jsonify({'error': 'Usuario no encontrado'}), 404
        
#         data = request.get_json()
        
#         if 'name' in data:
#             user.name = data['name'].strip()
        
#         db.session.commit()
        
#         return jsonify({
#             'message': 'Perfil actualizado exitosamente',
#             'user': user.to_dict()
#         }), 200
        
#     except Exception as e:
#         print(f"Error actualizando perfil: {str(e)}")
#         db.session.rollback()
#         return jsonify({'error': 'Error interno del servidor'}), 500
    
# @users_bp.route('/check-email', methods=['GET'])
# @jwt_required()
# def check_email():
#     email = request.args.get('email', '').strip().lower()
#     if not email:
#         return jsonify({'error': 'Email requerido'}), 400
    
#     exists = User.query.filter_by(email=email).first() is not None
#     return jsonify({'exists': exists}), 200

    
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_

import traceback
from app import db
from app.models import User
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
        
        # Validar rol
        valid_roles = ['admin', 'secretaria', 'tesorero', 'colaborador', 'user']
        if role not in valid_roles:
            print(f"❌ Rol inválido: {role}")
            return jsonify({'error': f'Rol inválido. Debe ser: {", ".join(valid_roles)}'}), 400
        
        # Crear nuevo usuario
        new_user = User(
            name=name,
            email=email,
            role=role,
            permissions=data.get('permissions', ['dashboard']),
            is_active=data.get('status', 'Activo') == 'Activo'
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"✅ Usuario creado exitosamente: {new_user.email} (ID: {new_user.id})")
        
        return jsonify({
            'message': 'Usuario creado exitosamente',
            'user': new_user.to_dict()
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
            user.role = data['role'].strip()
        if 'permissions' in data:
            user.permissions = data['permissions']
        if 'status' in data:
            user.is_active = data['status'] == 'Activo'
        
        # Actualizar contraseña si se proporciona
        if 'password' in data and data['password']:
            is_strong, message = is_strong_password(data['password'])
            if not is_strong:
                return jsonify({'error': message}), 400
            user.set_password(data['password'])
        
        db.session.commit()
        
        print(f"✅ Usuario actualizado: {user.email}")
        return jsonify({
            'message': 'Usuario actualizado exitosamente',
            'user': user.to_dict()
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
        
        return jsonify({'user': user.to_dict()}), 200
        
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
