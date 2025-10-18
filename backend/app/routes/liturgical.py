from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from sqlalchemy import text
from app import db
from app.models import ActoLiturgico, Horario, Reserva

liturgical_bp = Blueprint('liturgical', __name__)

# Helpers

def parse_date(date_str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception:
        return None

def parse_time(time_str):
    try:
        return datetime.strptime(time_str, '%H:%M').time()
    except Exception:
        return None

# =========================================================
# ACTOS LITÚRGICOS
# =========================================================

@liturgical_bp.route('/actos', methods=['GET'])
@jwt_required()
def list_actos():
    """Lista todos los actos litúrgicos activos"""
    try:
        items = db.session.execute(text("""
            SELECT
                a.actoliturgicoid,
                a.parroquiaid,
                p.par_nombre as parroquia_nombre,
                a.act_nombre,
                a.act_titulo,
                a.act_descripcion,
                a.act_estado,
                a.created_at,
                a.updated_at
            FROM public.actoliturgico a
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            WHERE a.act_estado = TRUE
            ORDER BY a.actoliturgicoid DESC
        """)).fetchall()

        result = []
        for row in items:
            result.append({
                'actoliturgicoid': row.actoliturgicoid,
                'parroquiaid': row.parroquiaid,
                'parroquia_nombre': row.parroquia_nombre,
                'act_nombre': row.act_nombre,
                'act_titulo': row.act_titulo,
                'act_descripcion': row.act_descripcion,
                'act_estado': row.act_estado,
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None
            })

        return jsonify({'items': result}), 200
    except Exception as e:
        print('Error list_actos', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/actos', methods=['POST'])
@jwt_required()
def create_acto():
    """Crea un nuevo acto litúrgico"""
    try:
        data = request.get_json() or {}

        required = [
            data.get('parroquiaid'),
            data.get('act_nombre'),
            data.get('act_titulo')
        ]

        if any(v in [None, '', False] for v in required):
            return jsonify({'error': 'parroquiaid, act_nombre y act_titulo son requeridos'}), 400

        # Insertar directamente en la base de datos
        result = db.session.execute(text("""
            INSERT INTO public.actoliturgico (parroquiaid, act_nombre, act_titulo, act_descripcion, act_estado)
            VALUES (:parroquiaid, :act_nombre, :act_titulo, :act_descripcion, :act_estado)
            RETURNING actoliturgicoid, created_at, updated_at
        """), {
            'parroquiaid': data.get('parroquiaid'),
            'act_nombre': (data.get('act_nombre') or '').strip(),
            'act_titulo': (data.get('act_titulo') or '').strip(),
            'act_descripcion': (data.get('act_descripcion') or '').strip() or None,
            'act_estado': bool(data.get('act_estado', True))
        })

        db.session.commit()
        new_id = result.fetchone()

        # Obtener el acto creado completo
        acto = db.session.execute(text("""
            SELECT
                a.actoliturgicoid,
                a.parroquiaid,
                p.par_nombre as parroquia_nombre,
                a.act_nombre,
                a.act_titulo,
                a.act_descripcion,
                a.act_estado,
                a.created_at,
                a.updated_at
            FROM public.actoliturgico a
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            WHERE a.actoliturgicoid = :id
        """), {'id': new_id.actoliturgicoid}).fetchone()

        return jsonify({
            'item': {
                'actoliturgicoid': acto.actoliturgicoid,
                'parroquiaid': acto.parroquiaid,
                'parroquia_nombre': acto.parroquia_nombre,
                'act_nombre': acto.act_nombre,
                'act_titulo': acto.act_titulo,
                'act_descripcion': acto.act_descripcion,
                'act_estado': acto.act_estado,
                'created_at': acto.created_at.isoformat() if acto.created_at else None,
                'updated_at': acto.updated_at.isoformat() if acto.updated_at else None
            }
        }), 201

    except Exception as e:
        print('Error create_acto', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/actos/<int:acto_id>', methods=['PUT'])
@jwt_required()
def update_acto(acto_id):
    """Actualiza un acto litúrgico"""
    try:
        data = request.get_json() or {}

        # Construir consulta dinámica
        set_parts = []
        params = {'id': acto_id}

        if 'parroquiaid' in data:
            set_parts.append('parroquiaid = :parroquiaid')
            params['parroquiaid'] = data.get('parroquiaid')
        if 'act_nombre' in data:
            set_parts.append('act_nombre = :act_nombre')
            params['act_nombre'] = (data.get('act_nombre') or '').strip()
        if 'act_titulo' in data:
            set_parts.append('act_titulo = :act_titulo')
            params['act_titulo'] = (data.get('act_titulo') or '').strip()
        if 'act_descripcion' in data:
            set_parts.append('act_descripcion = :act_descripcion')
            params['act_descripcion'] = (data.get('act_descripcion') or '').strip() or None
        if 'act_estado' in data:
            set_parts.append('act_estado = :act_estado')
            params['act_estado'] = bool(data.get('act_estado'))

        if not set_parts:
            return jsonify({'error': 'No hay datos para actualizar'}), 400

        set_clause = ', '.join(set_parts)
        query = f'UPDATE public.actoliturgico SET {set_clause} WHERE actoliturgicoid = :id'

        result = db.session.execute(text(query), params)
        db.session.commit()

        if result.rowcount == 0:
            return jsonify({'error': 'No encontrado'}), 404

        # Obtener el acto actualizado
        acto = db.session.execute(text("""
            SELECT
                a.actoliturgicoid,
                a.parroquiaid,
                p.par_nombre as parroquia_nombre,
                a.act_nombre,
                a.act_titulo,
                a.act_descripcion,
                a.act_estado,
                a.created_at,
                a.updated_at
            FROM public.actoliturgico a
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            WHERE a.actoliturgicoid = :id
        """), {'id': acto_id}).fetchone()

        return jsonify({
            'item': {
                'actoliturgicoid': acto.actoliturgicoid,
                'parroquiaid': acto.parroquiaid,
                'parroquia_nombre': acto.parroquia_nombre,
                'act_nombre': acto.act_nombre,
                'act_titulo': acto.act_titulo,
                'act_descripcion': acto.act_descripcion,
                'act_estado': acto.act_estado,
                'created_at': acto.created_at.isoformat() if acto.created_at else None,
                'updated_at': acto.updated_at.isoformat() if acto.updated_at else None
            }
        }), 200

    except Exception as e:
        print('Error update_acto', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/actos/<int:acto_id>', methods=['DELETE'])
@jwt_required()
def delete_acto(acto_id):
    """Elimina un acto litúrgico (y sus horarios asociados en cascada)"""
    try:
        result = db.session.execute(
            text('DELETE FROM public.actoliturgico WHERE actoliturgicoid = :id'),
            {'id': acto_id}
        )
        db.session.commit()

        if result.rowcount == 0:
            return jsonify({'error': 'No encontrado'}), 404

        return jsonify({'message': 'Eliminado correctamente'}), 200

    except Exception as e:
        print('Error delete_acto', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

# =========================================================
# HORARIOS
# =========================================================

@liturgical_bp.route('/horarios', methods=['GET'])
@jwt_required()
def list_horarios():
    """Lista todos los horarios de actos litúrgicos"""
    try:
        items = db.session.execute(text("""
            SELECT
                h.horarioid,
                h.actoliturgicoid,
                a.act_nombre,
                a.act_titulo,
                h.h_fecha,
                h.h_hora,
                h.parroquiaid,
                p.par_nombre as parroquia_nombre,
                h.created_at,
                h.updated_at
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON h.parroquiaid = p.parroquiaid
            ORDER BY h.h_fecha DESC, h.h_hora DESC
        """)).fetchall()

        result = []
        for row in items:
            result.append({
                'horarioid': row.horarioid,
                'actoliturgicoid': row.actoliturgicoid,
                'acto_nombre': row.act_nombre,
                'acto_titulo': row.act_titulo,
                'h_fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'h_hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'parroquiaid': row.parroquiaid,
                'parroquia_nombre': row.parroquia_nombre,
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None
            })

        return jsonify({'items': result}), 200
    except Exception as e:
        print('Error list_horarios', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/horarios', methods=['POST'])
@jwt_required()
def create_horario():
    """Crea un nuevo horario para un acto litúrgico"""
    try:
        data = request.get_json() or {}

        required = [
            data.get('actoliturgicoid'),
            data.get('h_fecha'),
            data.get('h_hora'),
            data.get('parroquiaid')
        ]

        if any(v in [None, '', False] for v in required):
            return jsonify({'error': 'actoliturgicoid, h_fecha, h_hora y parroquiaid son requeridos'}), 400

        h_fecha = parse_date(data.get('h_fecha'))
        h_hora = parse_time(data.get('h_hora'))

        if not h_fecha or not h_hora:
            return jsonify({'error': 'Fecha y hora inválidas'}), 400

        result = db.session.execute(text("""
            INSERT INTO public.horario (actoliturgicoid, h_fecha, h_hora, parroquiaid)
            VALUES (:actoliturgicoid, :h_fecha, :h_hora, :parroquiaid)
            RETURNING horarioid, created_at, updated_at
        """), {
            'actoliturgicoid': data.get('actoliturgicoid'),
            'h_fecha': h_fecha,
            'h_hora': h_hora,
            'parroquiaid': data.get('parroquiaid')
        })

        db.session.commit()
        new_id = result.fetchone()

        # Obtener el horario creado completo
        horario = db.session.execute(text("""
            SELECT
                h.horarioid,
                h.actoliturgicoid,
                a.act_nombre,
                a.act_titulo,
                h.h_fecha,
                h.h_hora,
                h.parroquiaid,
                p.par_nombre as parroquia_nombre,
                h.created_at,
                h.updated_at
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON h.parroquiaid = p.parroquiaid
            WHERE h.horarioid = :id
        """), {'id': new_id.horarioid}).fetchone()

        return jsonify({
            'item': {
                'horarioid': horario.horarioid,
                'actoliturgicoid': horario.actoliturgicoid,
                'acto_nombre': horario.act_nombre,
                'acto_titulo': horario.act_titulo,
                'h_fecha': horario.h_fecha.isoformat() if horario.h_fecha else None,
                'h_hora': horario.h_hora.strftime('%H:%M') if horario.h_hora else None,
                'parroquiaid': horario.parroquiaid,
                'parroquia_nombre': horario.parroquia_nombre,
                'created_at': horario.created_at.isoformat() if horario.created_at else None,
                'updated_at': horario.updated_at.isoformat() if horario.updated_at else None
            }
        }), 201

    except Exception as e:
        print('Error create_horario', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

# =========================================================
# RESERVAS
# =========================================================

@liturgical_bp.route('/reservas', methods=['GET'])
@jwt_required()
def list_reservas():
    """Lista todas las reservas de actos litúrgicos"""
    try:
        items = db.session.execute(text("""
            SELECT
                r.reservaid,
                r.horarioid,
                r.personaid,
                r.res_descripcion,
                r.res_estado,
                r.created_at,
                r.updated_at,
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                per.per_nombres || ' ' || per.per_apellidos as persona_nombre
            FROM public.reserva r
            LEFT JOIN public.horario h ON r.horarioid = h.horarioid
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON h.parroquiaid = p.parroquiaid
            LEFT JOIN public.persona per ON r.personaid = per.personaid
            ORDER BY r.created_at DESC
        """)).fetchall()

        result = []
        for row in items:
            result.append({
                'reservaid': row.reservaid,
                'horarioid': row.horarioid,
                'personaid': row.personaid,
                'persona_nombre': row.persona_nombre,
                'res_descripcion': row.res_descripcion,
                'res_estado': row.res_estado,  # true = Cancelado, false = Sin pagar
                'estado_texto': 'Cancelado' if row.res_estado else 'Sin pagar',
                'h_fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'h_hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'acto_nombre': row.act_nombre,
                'acto_titulo': row.act_titulo,
                'parroquia_nombre': row.parroquia_nombre,
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None
            })

        return jsonify({'items': result}), 200
    except Exception as e:
        print('Error list_reservas', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reservas', methods=['POST'])
@jwt_required()
def create_reserva():
    """Crea una nueva reserva para un horario"""
    try:
        data = request.get_json() or {}

        required = [
            data.get('horarioid'),
            data.get('res_descripcion')
        ]

        if any(v in [None, '', False] for v in required):
            return jsonify({'error': 'horarioid y res_descripcion son requeridos'}), 400

        result = db.session.execute(text("""
            INSERT INTO public.reserva (horarioid, personaid, res_descripcion, res_estado)
            VALUES (:horarioid, :personaid, :res_descripcion, :res_estado)
            RETURNING reservaid, created_at, updated_at
        """), {
            'horarioid': data.get('horarioid'),
            'personaid': data.get('personaid'),
            'res_descripcion': (data.get('res_descripcion') or '').strip(),
            'res_estado': bool(data.get('res_estado', False))
        })

        db.session.commit()
        new_id = result.fetchone()

        # Obtener la reserva creada completa
        reserva = db.session.execute(text("""
            SELECT
                r.reservaid,
                r.horarioid,
                r.personaid,
                r.res_descripcion,
                r.res_estado,
                r.created_at,
                r.updated_at,
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                per.per_nombres || ' ' || per.per_apellidos as persona_nombre
            FROM public.reserva r
            LEFT JOIN public.horario h ON r.horarioid = h.horarioid
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON h.parroquiaid = p.parroquiaid
            LEFT JOIN public.persona per ON r.personaid = per.personaid
            WHERE r.reservaid = :id
        """), {'id': new_id.reservaid}).fetchone()

        return jsonify({
            'item': {
                'reservaid': reserva.reservaid,
                'horarioid': reserva.horarioid,
                'personaid': reserva.personaid,
                'persona_nombre': reserva.persona_nombre,
                'res_descripcion': reserva.res_descripcion,
                'res_estado': reserva.res_estado,
                'estado_texto': 'Cancelado' if reserva.res_estado else 'Sin pagar',
                'h_fecha': reserva.h_fecha.isoformat() if reserva.h_fecha else None,
                'h_hora': reserva.h_hora.strftime('%H:%M') if reserva.h_hora else None,
                'acto_nombre': reserva.act_nombre,
                'acto_titulo': reserva.act_titulo,
                'parroquia_nombre': reserva.parroquia_nombre,
                'created_at': reserva.created_at.isoformat() if reserva.created_at else None,
                'updated_at': reserva.updated_at.isoformat() if reserva.updated_at else None
            }
        }), 201

    except Exception as e:
        print('Error create_reserva', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

# =========================================================
# CONSULTAS ESPECÍFICAS PARA EL CALENDARIO
# =========================================================

@liturgical_bp.route('/calendario', methods=['GET'])
@jwt_required()
def get_calendario():
    """Obtiene eventos para el calendario (próximos 30 días)"""
    try:
        items = db.session.execute(text("""
            SELECT
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COUNT(r.reservaid) as reservas_count,
                COUNT(CASE WHEN r.res_estado = FALSE THEN 1 END) as reservas_activas_count,
                h.horarioid,
                a.actoliturgicoid
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON h.parroquiaid = p.parroquiaid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            WHERE h.h_fecha >= CURRENT_DATE
              AND h.h_fecha < CURRENT_DATE + INTERVAL '30 days'
            GROUP BY h.h_fecha, h.h_hora, a.act_nombre, a.act_titulo, p.par_nombre, h.horarioid, a.actoliturgicoid
            ORDER BY h.h_fecha, h.h_hora
        """)).fetchall()

        result = []
        for row in items:
            result.append({
                'date': row.h_fecha.isoformat() if row.h_fecha else None,
                'time': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'type': row.act_nombre,
                'title': row.act_titulo,
                'location': row.parroquia_nombre,
                'reservas_count': row.reservas_count,
                'reservas_activas_count': row.reservas_activas_count,
                'horarioid': row.horarioid,
                'actoliturgicoid': row.actoliturgicoid
            })

        return jsonify({'items': result}), 200
    except Exception as e:
        print('Error get_calendario', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/horarios/fecha/<date_str>', methods=['GET'])
@jwt_required()
def get_horarios_by_date(date_str):
    """Obtiene horarios para una fecha específica"""
    try:
        fecha = parse_date(date_str)
        if not fecha:
            return jsonify({'error': 'Fecha inválida'}), 400

        items = db.session.execute(text("""
            SELECT
                h.horarioid,
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COUNT(r.reservaid) as reservas_total,
                COUNT(CASE WHEN r.res_estado = FALSE THEN 1 END) as reservas_activas
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON h.parroquiaid = p.parroquiaid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            WHERE h.h_fecha = :fecha
            GROUP BY h.horarioid, h.h_fecha, h.h_hora, a.act_nombre, a.act_titulo, p.par_nombre
            ORDER BY h.h_hora
        """), {'fecha': fecha}).fetchall()

        result = []
        for row in items:
            result.append({
                'horarioid': row.horarioid,
                'h_fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'h_hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'act_nombre': row.act_nombre,
                'act_titulo': row.act_titulo,
                'parroquia_nombre': row.parroquia_nombre,
                'reservas_total': row.reservas_total,
                'reservas_activas': row.reservas_activas
            })

        return jsonify({'items': result}), 200
    except Exception as e:
        print('Error get_horarios_by_date', e)
        return jsonify({'error': 'Error interno del servidor'}), 500
