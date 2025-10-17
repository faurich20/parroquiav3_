from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    decode_token,# 🔧 usado para obtener jti del refresh token
    verify_jwt_in_request
)
from datetime import datetime, timedelta
import traceback

from app import db, jwt
from app.models import User, RefreshToken
from app.utils.security import is_valid_email, is_strong_password

auth_bp = Blueprint('auth', __name__)


# 🧩 CALLBACK para detectar expiración del token
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    user_id = jwt_payload.get('sub', 'desconocido')
    token_type = jwt_payload.get('type', 'N/A')
    print(f"⚠️ Token expirado: tipo={token_type}, usuario={user_id}")
    return jsonify({'error': 'El token ha expirado', 'expired': True}), 401


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        print("🔍 Solicitud de login recibida")
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email y contraseña son requeridos'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validar email
        if not is_valid_email(email):
            return jsonify({'error': 'Formato de email inválido'}), 400
        
        # Buscar usuario
        user = User.query.filter_by(email=email, is_active=True).first()
        print(f"🔍 Usuario encontrado: {user is not None}")
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        print("✅ Credenciales válidas")
        
        # Actualizar último login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # ✅ CREAR TOKENS CORRECTAMENTE - asegurar que identity sea string
        access_token = create_access_token(identity=str(user.id))  # ← ¡IMPORTANTE!
        refresh_token = create_refresh_token(identity=str(user.id))  # ← ¡IMPORTANTE!
        
        print("✅ Tokens creados correctamente")

        # 🔧 Revocar tokens anteriores activos de este usuario antes de guardar el nuevo
        RefreshToken.query.filter_by(user_id=user.id, revoked=False).update({'revoked': True})
        db.session.commit()

        # Guardar refresh token en la base de datos (guardar también su jti)
        expires_at = datetime.utcnow() + timedelta(days=30)
        try:
            decoded = decode_token(refresh_token)
            jti = decoded.get('jti')
        except Exception:
            jti = None

        new_refresh_token = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            jti=jti,  # 🔧 almacenamos jti si está disponible
            expires_at=expires_at,
            revoked=False
        )
        db.session.add(new_refresh_token)
        db.session.commit()
        
        print("✅ Login exitoso - Tokens creados")
        return jsonify({
            'message': 'Login exitoso',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"❌ Error en login: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Error interno del servidor'}), 500
    


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        # Identidad desde el claim (viene como string si creaste así)
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Usuario no válido'}), 401
        
        # Obtener payload del refresh token validado por flask-jwt-extended
        jwt_payload = get_jwt()
        incoming_jti = jwt_payload.get('jti')

        # Buscar en la BD el refresh token por jti (compatibilidad superior)
        refresh_entry = None
        if incoming_jti:
            refresh_entry = RefreshToken.query.filter_by(jti=incoming_jti, user_id=user.id).first()

        # Si por alguna razón no se encontró por jti, intentar fallback por token raw
        if not refresh_entry:
            auth_header = request.headers.get('Authorization', None)
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Refresh token no proporcionado'}), 401
            raw_refresh_token = auth_header.split(' ')[1]
            refresh_entry = RefreshToken.query.filter_by(token=raw_refresh_token, user_id=user.id).first()

        if not refresh_entry or refresh_entry.revoked or refresh_entry.expires_at < datetime.utcnow():
            return jsonify({'error': 'Refresh token inválido o revocado'}), 401
        
        # 🔧 ROTACIÓN: revocar el token usado y crear uno nuevo
        refresh_entry.revoked = True
        db.session.add(refresh_entry)

        new_access_token = create_access_token(identity=str(user.id))
        new_refresh_token = create_refresh_token(identity=str(user.id))

        # Obtener jti del nuevo refresh token y guardarlo
        try:
            decoded_new = decode_token(new_refresh_token)
            jti_new = decoded_new.get('jti')
        except Exception:
            jti_new = None

        new_expires = datetime.utcnow() + timedelta(days=30)
        new_entry = RefreshToken(
            user_id=user.id,
            token=new_refresh_token,
            jti=jti_new,
            expires_at=new_expires,
            revoked=False
        )
        db.session.add(new_entry)
        db.session.commit()

        return jsonify({
            'access_token': new_access_token,
            'refresh_token': new_refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"❌ Error en refresh: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Error al refrescar token'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    try:
        user_id = None

        # 1️⃣ Intentar obtener identidad desde access token (si viene)
        try:
            verify_jwt_in_request()  # no tiene optional=True
            user_id = int(get_jwt_identity())
        except Exception:
            pass  # access token ausente o expirado

        # 2️⃣ Si no se pudo obtener, intentar con refresh_token
        if not user_id:
            data = request.get_json(silent=True) or {}
            raw_refresh = data.get('refresh_token') or request.headers.get('X-Refresh-Token')
            if raw_refresh and raw_refresh.startswith('Bearer '):
                raw_refresh = raw_refresh.split(' ', 1)[1]

            if raw_refresh:
                try:
                    decoded = decode_token(raw_refresh)
                    identity = decoded.get('sub') or decoded.get('identity')
                    if identity:
                        user_id = int(identity)
                except Exception as e:
                    print("⚠️ Refresh token inválido al hacer logout:", str(e))

        # 3️⃣ Revocar refresh tokens
        if user_id:
            count = RefreshToken.query.filter_by(user_id=user_id, revoked=False).update({'revoked': True})
            db.session.commit()
            print(f"✅ Logout: revocados {count} tokens del usuario {user_id}")
        else:
            print("⚠️ Logout sin usuario identificado")

        return jsonify({"message": "Logout exitoso"}), 200

    except Exception as e:
        print("❌ Error en logout:", str(e))
        return jsonify({"error": "Error al hacer logout"}), 500




@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data or 'name' not in data:
            return jsonify({'error': 'Nombre, email y contraseña son requeridos'}), 400
        
        name = data['name'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validaciones
        if not is_valid_email(email):
            return jsonify({'error': 'Formato de email inválido'}), 400
        
        is_strong, message = is_strong_password(password)
        if not is_strong:
            return jsonify({'error': message}), 400
        
        # Verificar si el usuario ya existe
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'El usuario ya existe'}), 409
        
        # Crear nuevo usuario (permisos se derivan del rol)
        new_user = User(
            name=name,
            email=email,
            role='user'
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuario registrado exitosamente',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        print(f"❌ Error en registro: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Error al registrar usuario'}), 500

