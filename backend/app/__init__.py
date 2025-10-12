from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import datetime, date  # 🔧 agregado

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()

def create_app():
    app = Flask(__name__)
    load_dotenv()
    
    # Configuración
    app.config.from_object('app.config.Config')
    
    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    #cors.init_app(app, origins=app.config['CORS_ORIGINS'])
    cors = CORS(app, resources={
    r"/api/*": {
        "origins": app.config['CORS_ORIGINS'],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True,
        "max_age": 3600
    }
    })

    # 🔧 Callback para bloquear tokens revocados/expirados (blocklist)
    #      - Sólo aplicamos esta verificación para refresh tokens, porque sólo
    #        los refresh tokens están guardados en la tabla `refresh_tokens`.
    #      - Si un refresh token no está en la tabla o está revocado/expirado,
    #        se considera bloqueado.
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        token_type = jwt_payload.get('type')
        jti = jwt_payload.get('jti')
        if token_type == 'refresh':
            # import dentro de la función para evitar problemas de import circular
            from app.models import RefreshToken
            if not jti:
                print("⚠️ JWT sin JTI en payload (refresh) -> bloqueado")
                return True
            entry = RefreshToken.query.filter_by(jti=jti).first()
            # Si no existe el registro o está revocado/expirado -> bloqueado
            if not entry:
                print(f"⚠️ Refresh token JTI {jti} no encontrado en BD -> bloqueado")
                return True
            if entry.revoked or entry.expires_at < datetime.utcnow():
                return True
        # Para access tokens no hacemos bloqueo por BD (no guardamos sus jti aquí)
        return False

    # 🔥 MANEJADORES DE ERRORES
    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Error interno del servidor',
            'details': str(e) if app.debug else 'Contacte al administrador'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return e
        
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Error inesperado en el servidor',
            'details': str(e) if app.debug else 'Contacte al administrador'
        }), 500
    
    # Middleware de debug
    @app.before_request
    def log_request_info():
        if request.path.startswith('/api/'):
            print(f"🌐 Request: {request.method} {request.path}")
            print(f"   Content-Type: {request.content_type}")
            print(f"   Headers: {dict(request.headers)}")
            if request.get_data():
                print(f"   Body: {request.get_data(as_text=True)}")

    # 🔧 Actualizar last_activity del usuario en cada request autenticada (si viene token access)
    #      - Usamos verify_jwt_in_request_optional para no forzar token en todas las rutas,
    #        sólo cuando existe un JWT válido en la request.
    #      - Actualizamos la columna `last_activity` del User (se añadió a models).
    @app.before_request
    def update_last_activity():
        # Sólo interesan las peticiones API
        if not request.path.startswith('/api/'):
            return
        try:
            # import local para evitar conflictos de import circular
            from flask_jwt_extended import verify_jwt_in_request_optional, get_jwt, get_jwt_identity
            verify_jwt_in_request_optional()
            jwt_payload = None
            try:
                jwt_payload = get_jwt()
            except Exception:
                jwt_payload = None

            # Si hay un JWT y es tipo access, actualizar actividad del usuario
            if jwt_payload and jwt_payload.get('type') == 'access':
                user_id = get_jwt_identity()
                if user_id:
                    from app.models import User
                    user = User.query.get(int(user_id))
                    if user:
                        # 🔧 Verificar inactividad mayor a 10 minutos (600 segundos)
                        if user.last_activity and (datetime.utcnow() - user.last_activity).total_seconds() > 600:
                            print(f"⚠️ Usuario {user.id} inactivo más de 10 min, sesión expirada.")
                            from flask import jsonify
                            return jsonify({'error': 'Sesión expirada por inactividad'}), 401
                        # Guardamos la última actividad para que el backend también pueda
                        # invalidar por inactividad si se desea.
                        user.last_activity = datetime.utcnow()
                        db.session.commit()
        except Exception:
            # No queremos que cualquier error en este middleware bloquee la API
            pass
    
    # Registrar blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp  # ✅ Importar el blueprint de usuarios
    from app.routes.roles import roles_bp  # ✅ Importar el blueprint de roles
    from app.routes.permissions import permissions_bp  # ✅ Catálogo de permisos
    from app.routes.geo import geo_bp
    from app.routes.parroquias import parroquias_bp
    from app.routes.personas import personas_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')  # ✅ Registrar blueprint
    app.register_blueprint(roles_bp, url_prefix='/api/roles')  # ✅ Registrar blueprint de roles
    app.register_blueprint(permissions_bp, url_prefix='/api/permissions')  # ✅ Catálogo permisos
    app.register_blueprint(geo_bp, url_prefix='/api/geo')
    app.register_blueprint(parroquias_bp, url_prefix='/api/parroquias')
    app.register_blueprint(personas_bp, url_prefix='/api/personas')

    # Crear tablas si no existen (útil en desarrollo)
    with app.app_context():
        try:
            db.create_all()
        except Exception:
            pass
        try:
            from app.models import User, Role, Provincia, Distrito, Departamento, Parroquia, Persona
            if User.query.count() == 0:
                admin_role = Role.query.filter_by(name='Admin').first()
                if not admin_role:
                    admin_role = Role(name='Admin', description='Administrador', permissions=['menu_principal','personal', 'liturgico', 'ventas', 'compras', 'almacen', 'contabilidad', 'reportes', 'seguridad', 'configuracion'])
                    db.session.add(admin_role)
                    db.session.flush()

                prov = Provincia(prov_nombre='Lima')
                dist = Distrito(dis_nombre='Lima')
                db.session.add_all([prov, dist])
                db.session.flush()

                dep = Departamento(dep_nombre='Lima', provinciaid=prov.provinciaid, distritoid=dist.distritoid)
                db.session.add(dep)
                db.session.flush()

                parr = Parroquia(par_nombre='Parroquia Central', par_direccion='Av. Principal 123', departamentoid=dep.departamentoid, par_telefono1='0000000', par_telefono2=None)
                db.session.add(parr)
                db.session.flush()

                admin = User(name='Administrador', email='admin@parroquia.com', role='Admin', permissions=['personal', 'liturgico', 'ventas', 'compras', 'almacen', 'contabilidad', 'reportes', 'seguridad', 'configuracion'])
                admin.set_password('Admin123!')
                db.session.add(admin)
                db.session.flush()

                persona = Persona(userid=admin.id, per_nombres='Admin', per_apellidos='Principal', per_domicilio='Av. Principal 123', per_telefono='0000000', fecha_nacimiento=date(1990, 1, 1), parroquiaid=parr.parroquiaid)
                db.session.add(persona)

                db.session.commit()
        except Exception:
            db.session.rollback()
    
    return app