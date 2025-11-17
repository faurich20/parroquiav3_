from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from datetime import datetime
from sqlalchemy import text
from app import db
from app.utils.permissions import has_permission

pagos_bp = Blueprint('pagos', __name__)

@pagos_bp.before_request
def _enforce_accounting_or_sales_permission():
    from flask import request as _request

    # Permitir preflight CORS sin autenticación
    if _request.method == 'OPTIONS':
        return None

    # Permitir endpoints públicos de prueba/diagnóstico sin auth
    public_endpoints = {'pagos.debug_pagos', 'pagos.test_pagos'}
    if _request.endpoint in public_endpoints:
        return None

    # Para el resto, exigir JWT y alguno de los permisos contabilidad o ventas
    verify_jwt_in_request()
    if not (has_permission('contabilidad') or has_permission('ventas')):
        return jsonify({'error': 'Forbidden', 'message': 'Permiso requerido: contabilidad o ventas'}), 403

@pagos_bp.route('/pagos', methods=['OPTIONS', 'POST'])
@jwt_required()
def create_pago():
    """Crea un nuevo pago"""
    print("🔄 [BACKEND] Endpoint /api/pagos llamado")
    print(f"🔄 [BACKEND] Método: {request.method}")
    print(f"🔄 [BACKEND] Headers: {dict(request.headers)}")

    # Verificar autenticación JWT
    try:
        current_user = get_jwt_identity()
        jwt_info = get_jwt()
        print(f"🔄 [BACKEND] Usuario autenticado: {current_user}")
        print(f"🔄 [BACKEND] JWT info: {jwt_info}")
    except Exception as e:
        print(f"❌ [BACKEND] Error JWT: {str(e)}")
        return jsonify({'error': 'No autorizado'}), 401

    # Handle CORS preflight
    if request.method == 'OPTIONS':
        print("🔄 [BACKEND] Request OPTIONS - CORS preflight")
        return jsonify({}), 200

    try:
        data = request.get_json() or {}
        print(f"🔄 [BACKEND] Datos recibidos: {data}")

        required = [
            data.get('pago_medio'),
            data.get('pago_monto')
        ]

        print(f"🔄 [BACKEND] Campos requeridos: {required}")

        if any(v in [None, '', False] for v in required):
            error_msg = 'pago_medio y pago_monto son requeridos'
            print(f"❌ [BACKEND] Error validación: {error_msg}")
            return jsonify({'error': error_msg}), 400

        # Validar monto
        try:
            monto = float(data.get('pago_monto'))
            if monto <= 0:
                error_msg = 'El monto debe ser mayor a 0'
                print(f"❌ [BACKEND] Error monto: {error_msg}")
                return jsonify({'error': error_msg}), 400
        except (ValueError, TypeError):
            error_msg = 'Monto inválido'
            print(f"❌ [BACKEND] Error monto tipo: {error_msg}")
            return jsonify({'error': error_msg}), 400

        print("✅ [BACKEND] Validación exitosa, creando pago...")

        result = db.session.execute(text("""
            INSERT INTO public.pago (
                pago_medio, pago_monto, pago_estado, pago_descripcion,
                pago_fecha, pago_confirmado
            )
            VALUES (
                :pago_medio, :pago_monto, :pago_estado, :pago_descripcion,
                :pago_fecha, :pago_confirmado
            )
            RETURNING pagoid, created_at, updated_at
        """), {
            'pago_medio': data.get('pago_medio'),
            'pago_monto': monto,
            'pago_estado': data.get('pago_estado', 'pagado'),
            'pago_descripcion': data.get('pago_descripcion', ''),
            'pago_fecha': datetime.fromisoformat(data.get('pago_fecha', datetime.now().isoformat()).replace('Z', '+00:00')),
            'pago_confirmado': datetime.fromisoformat(data.get('pago_fecha', datetime.now().isoformat()).replace('Z', '+00:00'))
        })

        db.session.commit()
        new_id = result.fetchone()
        print(f"✅ [BACKEND] Pago creado con ID: {new_id.pagoid}")

        response_data = {
            'pago': {
                'pagoid': new_id.pagoid,
                'pago_medio': data.get('pago_medio'),
                'pago_monto': monto,
                'pago_estado': data.get('pago_estado', 'pagado'),
                'pago_descripcion': data.get('pago_descripcion', ''),
                'pago_fecha': data.get('pago_fecha', datetime.now().isoformat()),
                'pago_confirmado': data.get('pago_fecha', datetime.now().isoformat()),
                'created_at': new_id.created_at.isoformat(),
                'updated_at': new_id.updated_at.isoformat()
            }
        }
        print(f"✅ [BACKEND] Respuesta: {response_data}")
        return jsonify(response_data), 201

    except Exception as e:
        print(f"❌ [BACKEND] Error interno: {str(e)}")
        import traceback
        print(f"❌ [BACKEND] Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500


@pagos_bp.route('/debug', methods=['GET'])
def debug_pagos():
    """Endpoint de debug sin autenticación para verificar blueprint"""
    print("🔍 [BACKEND] Endpoint /api/pagos/debug llamado")
    try:
        # Verificar si la tabla pago existe
        from app.models import Pago
        count = Pago.query.count()
        print(f"🔍 [BACKEND] Registros en tabla pago: {count}")

        # Verificar modelo Pago
        print(f"🔍 [BACKEND] Modelo Pago: {Pago}")
        print(f"🔍 [BACKEND] Tabla Pago: {Pago.__tablename__}")
        print(f"🔍 [BACKEND] Columnas Pago: {[col.name for col in Pago.__table__.columns]}")

        return jsonify({
            'message': 'Debug de pagos funcionando',
            'status': 'ok',
            'blueprint': 'pagos',
            'modelo_pago': {
                'nombre': 'Pago',
                'tabla': Pago.__tablename__,
                'columnas': [col.name for col in Pago.__table__.columns]
            },
            'registros_pago': count,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        print(f"❌ [BACKEND] Error en debug: {str(e)}")
        return jsonify({'error': 'Error en debug', 'details': str(e)}), 500


@pagos_bp.route('/test-auth', methods=['GET'])
@jwt_required()
def test_pagos_auth():
    """Endpoint de prueba CON autenticación para verificar JWT"""
    try:
        current_user = get_jwt_identity()
        print(f"✅ [BACKEND] Endpoint /api/pagos/test-auth - Usuario: {current_user}")
        return jsonify({
            'message': 'Blueprint de pagos con autenticación funcionando',
            'user': current_user,
            'status': 'authenticated',
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        print(f"❌ [BACKEND] Error autenticación: {str(e)}")
        return jsonify({'error': 'No autorizado', 'details': str(e)}), 401


@pagos_bp.route('/test', methods=['GET'])
def test_pagos():
    """Endpoint de prueba SIN autenticación para verificar que el blueprint funciona"""
    print("✅ [BACKEND] Endpoint /api/pagos/test llamado correctamente")
    return jsonify({
        'message': 'Blueprint de pagos funcionando',
        'status': 'ok',
        'timestamp': datetime.now().isoformat()
    }), 200
