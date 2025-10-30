from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
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
# ACTOS LITÚRGICOS CON HORARIO (OPERACIÓN COMBINADA)
# =========================================================

@liturgical_bp.route('/actos-con-horario', methods=['POST'])
@jwt_required()
def create_acto_con_horario():
    """Crea un nuevo acto litúrgico junto con su horario"""
    try:
        data = request.get_json() or {}

        # Validar campos requeridos para acto
        required_acto = [
            data.get('parroquiaid'),
            data.get('act_nombre'),
            data.get('act_titulo')
        ]

        # Validar campos requeridos para horario
        required_horario = [
            data.get('h_fecha'),
            data.get('h_hora')
        ]

        if any(v in [None, '', False] for v in required_acto):
            return jsonify({'error': 'parroquiaid, act_nombre y act_titulo son requeridos para el acto'}), 400

        if any(v in [None, '', False] for v in required_horario):
            return jsonify({'error': 'h_fecha y h_hora son requeridos para el horario'}), 400

        h_fecha = parse_date(data.get('h_fecha'))
        h_hora = parse_time(data.get('h_hora'))

        if not h_fecha or not h_hora:
            return jsonify({'error': 'Fecha y hora inválidas'}), 400

        # Iniciar transacción
        acto_id = None
        horario_id = None

        try:
            # 1. Crear el acto litúrgico
            acto_result = db.session.execute(text("""
                INSERT INTO public.actoliturgico (parroquiaid, act_nombre, act_titulo, act_descripcion, act_estado)
                VALUES (:parroquiaid, :act_nombre, :act_titulo, :act_descripcion, :act_estado)
                RETURNING actoliturgicoid
            """), {
                'parroquiaid': data.get('parroquiaid'),
                'act_nombre': (data.get('act_nombre') or '').strip(),
                'act_titulo': (data.get('act_titulo') or '').strip(),
                'act_descripcion': (data.get('act_descripcion') or '').strip() or None,
                'act_estado': bool(data.get('act_estado', True))
            })

            acto_id = acto_result.fetchone().actoliturgicoid

            # 2. Crear el horario asociado
            horario_result = db.session.execute(text("""
                INSERT INTO public.horario (actoliturgicoid, h_fecha, h_hora)
                VALUES (:actoliturgicoid, :h_fecha, :h_hora)
                RETURNING horarioid
            """), {
                'actoliturgicoid': acto_id,
                'h_fecha': h_fecha,
                'h_hora': h_hora
            })

            horario_id = horario_result.fetchone().horarioid

            db.session.commit()

            # Obtener el resultado completo
            resultado = db.session.execute(text("""
                SELECT
                    a.actoliturgicoid,
                    a.parroquiaid,
                    p.par_nombre as parroquia_nombre,
                    a.act_nombre,
                    a.act_titulo,
                    a.act_descripcion,
                    a.act_estado,
                    a.created_at,
                    a.updated_at,
                    h.horarioid,
                    h.h_fecha,
                    h.h_hora,
                    h.created_at as horario_created_at,
                    h.updated_at as horario_updated_at
                FROM public.actoliturgico a
                LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
                LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
                WHERE a.actoliturgicoid = :acto_id
            """), {'acto_id': acto_id}).fetchone()

            return jsonify({
                'success': True,
                'message': 'Acto litúrgico y horario creados correctamente',
                'acto': {
                    'actoliturgicoid': resultado.actoliturgicoid,
                    'parroquiaid': resultado.parroquiaid,
                    'parroquia_nombre': resultado.parroquia_nombre,
                    'act_nombre': resultado.act_nombre,
                    'act_titulo': resultado.act_titulo,
                    'act_descripcion': resultado.act_descripcion,
                    'act_estado': resultado.act_estado,
                    'created_at': resultado.created_at.isoformat() if resultado.created_at else None,
                    'updated_at': resultado.updated_at.isoformat() if resultado.updated_at else None
                },
                'horario': {
                    'horarioid': resultado.horarioid,
                    'actoliturgicoid': resultado.actoliturgicoid,
                    'h_fecha': resultado.h_fecha.isoformat() if resultado.h_fecha else None,
                    'h_hora': resultado.h_hora.strftime('%H:%M') if resultado.h_hora else None,
                    'parroquiaid': resultado.parroquiaid,
                    'created_at': resultado.horario_created_at.isoformat() if resultado.horario_created_at else None,
                    'updated_at': resultado.horario_updated_at.isoformat() if resultado.horario_updated_at else None
                }
            }), 201

        except Exception as inner_e:
            db.session.rollback()
            raise inner_e

    except Exception as e:
        print('Error create_acto_con_horario', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/actos', methods=['GET'])
@jwt_required()
def list_actos():
    """Lista todos los actos litúrgicos activos con sus horarios asociados"""
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
                a.updated_at,
                h.horarioid,
                h.h_fecha,
                h.h_hora
            FROM public.actoliturgico a
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
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
                'horarioid': row.horarioid,
                'h_fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'h_hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
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
    """Crea un nuevo acto litúrgico (opcionalmente con horario)"""
    try:
        data = request.get_json() or {}

        required = [
            data.get('parroquiaid'),
            data.get('act_nombre'),
            data.get('act_titulo')
        ]

        if any(v in [None, '', False] for v in required):
            return jsonify({'error': 'parroquiaid, act_nombre y act_titulo son requeridos'}), 400

        # Iniciar transacción
        acto_id = None
        horario_id = None

        try:
            # 1. Crear el acto litúrgico
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

            acto_id = result.fetchone().actoliturgicoid

            # 2. Crear horario si se proporcionan fecha y hora
            if 'h_fecha' in data and 'h_hora' in data:
                h_fecha = parse_date(data.get('h_fecha'))
                h_hora = parse_time(data.get('h_hora'))

                if h_fecha and h_hora:
                    horario_result = db.session.execute(text("""
                        INSERT INTO public.horario (actoliturgicoid, h_fecha, h_hora)
                        VALUES (:actoliturgicoid, :h_fecha, :h_hora)
                        RETURNING horarioid
                    """), {
                        'actoliturgicoid': acto_id,
                        'h_fecha': h_fecha,
                        'h_hora': h_hora
                    })
                    horario_id = horario_result.fetchone().horarioid

            db.session.commit()

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
                    a.updated_at,
                    h.horarioid,
                    h.h_fecha,
                    h.h_hora
                FROM public.actoliturgico a
                LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
                LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
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
                    'horarioid': acto.horarioid,
                    'h_fecha': acto.h_fecha.isoformat() if acto.h_fecha else None,
                    'h_hora': acto.h_hora.strftime('%H:%M') if acto.h_hora else None,
                    'created_at': acto.created_at.isoformat() if acto.created_at else None,
                    'updated_at': acto.updated_at.isoformat() if acto.updated_at else None
                }
            }), 201

        except Exception as inner_e:
            db.session.rollback()
            raise inner_e

    except Exception as e:
        print('Error create_acto', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/actos/<int:acto_id>', methods=['PUT'])
@jwt_required()
def update_acto(acto_id):
    """Actualiza un acto litúrgico y su horario asociado"""
    try:
        data = request.get_json() or {}

        # Construir consulta dinámica para acto
        set_parts_acto = []
        params = {'id': acto_id}

        if 'parroquiaid' in data:
            set_parts_acto.append('parroquiaid = :parroquiaid')
            params['parroquiaid'] = data.get('parroquiaid')
        if 'act_nombre' in data:
            set_parts_acto.append('act_nombre = :act_nombre')
            params['act_nombre'] = (data.get('act_nombre') or '').strip()
        if 'act_titulo' in data:
            set_parts_acto.append('act_titulo = :act_titulo')
            params['act_titulo'] = (data.get('act_titulo') or '').strip()
        if 'act_descripcion' in data:
            set_parts_acto.append('act_descripcion = :act_descripcion')
            params['act_descripcion'] = (data.get('act_descripcion') or '').strip() or None
        if 'act_estado' in data:
            set_parts_acto.append('act_estado = :act_estado')
            params['act_estado'] = bool(data.get('act_estado'))

        if not set_parts_acto:
            return jsonify({'error': 'No hay datos para actualizar'}), 400

        set_clause_acto = ', '.join(set_parts_acto)

        # Iniciar transacción
        try:
            # 1. Actualizar el acto litúrgico
            query_acto = f'UPDATE public.actoliturgico SET {set_clause_acto} WHERE actoliturgicoid = :id'
            result_acto = db.session.execute(text(query_acto), params)

            # 2. Actualizar horario si hay cambios en fecha/hora
            if 'h_fecha' in data or 'h_hora' in data:
                h_fecha = None
                h_hora = None

                if 'h_fecha' in data and data.get('h_fecha'):
                    h_fecha = parse_date(data.get('h_fecha'))
                if 'h_hora' in data and data.get('h_hora'):
                    h_hora = parse_time(data.get('h_hora'))

                if h_fecha and h_hora:
                    # Verificar si ya existe horario para este acto
                    existing_horario = db.session.execute(
                        text('SELECT horarioid FROM public.horario WHERE actoliturgicoid = :acto_id'),
                        {'acto_id': acto_id}
                    ).fetchone()

                    if existing_horario:
                        # Actualizar horario existente
                        db.session.execute(text("""
                            UPDATE public.horario
                            SET h_fecha = :h_fecha, h_hora = :h_hora
                            WHERE actoliturgicoid = :acto_id
                        """), {
                            'acto_id': acto_id,
                            'h_fecha': h_fecha,
                            'h_hora': h_hora
                        })
                    else:
                        # Crear nuevo horario
                        db.session.execute(text("""
                            INSERT INTO public.horario (actoliturgicoid, h_fecha, h_hora)
                            VALUES (:actoliturgicoid, :h_fecha, :h_hora)
                        """), {
                            'actoliturgicoid': acto_id,
                            'h_fecha': h_fecha,
                            'h_hora': h_hora
                        })

            db.session.commit()

            if result_acto.rowcount == 0:
                return jsonify({'error': 'Acto no encontrado'}), 404

            # Obtener el acto actualizado completo
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
                    a.updated_at,
                    h.horarioid,
                    h.h_fecha,
                    h.h_hora
                FROM public.actoliturgico a
                LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
                LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
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
                    'horarioid': acto.horarioid,
                    'h_fecha': acto.h_fecha.isoformat() if acto.h_fecha else None,
                    'h_hora': acto.h_hora.strftime('%H:%M') if acto.h_hora else None,
                    'created_at': acto.created_at.isoformat() if acto.created_at else None,
                    'updated_at': acto.updated_at.isoformat() if acto.updated_at else None
                }
            }), 200

        except Exception as inner_e:
            db.session.rollback()
            raise inner_e

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
    """Lista todos los horarios de actos litúrgicos (acepta filtros por parroquia y fecha)"""
    try:
        # Leer parámetros opcionales
        parroquia_id = request.args.get('parroquiaid', type=int)
        fecha_str = request.args.get('fecha', type=str)

        params = {}
        where_clauses = []

        # Aplicar filtro por parroquia si se proporcionó
        if parroquia_id:
            where_clauses.append('a.parroquiaid = :parroquiaid')
            params['parroquiaid'] = parroquia_id

        # Aplicar filtro por fecha si se proporcionó (validar formato YYYY-MM-DD)
        if fecha_str:
            fecha = parse_date(fecha_str)
            if not fecha:
                return jsonify({'error': 'Fecha inválida'}), 400
            where_clauses.append('h.h_fecha = :fecha')
            params['fecha'] = fecha

        where_sql = ('WHERE ' + ' AND '.join(where_clauses)) if where_clauses else ''

        # Consulta parametrizada con cláusula WHERE dinámica
        items = db.session.execute(text(f"""
            SELECT
                h.horarioid,
                h.actoliturgicoid,
                a.act_nombre,
                a.act_titulo,
                h.h_fecha,
                h.h_hora,
                a.parroquiaid,
                p.par_nombre as parroquia_nombre,
                COALESCE(COUNT(r.reservaid), 0) as reservas_total
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            {where_sql}
            GROUP BY h.horarioid, h.actoliturgicoid, a.act_nombre, a.act_titulo, h.h_fecha, h.h_hora, a.parroquiaid, p.par_nombre
            ORDER BY h.h_fecha DESC, h.h_hora DESC
        """), params).fetchall()

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
                'reservas_total': row.reservas_total,
                'created_at': getattr(row, 'created_at', None).isoformat() if getattr(row, 'created_at', None) else None,
                'updated_at': getattr(row, 'updated_at', None).isoformat() if getattr(row, 'updated_at', None) else None
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
            data.get('h_hora')
        ]

        if any(v in [None, '', False] for v in required):
            return jsonify({'error': 'actoliturgicoid, h_fecha y h_hora son requeridos'}), 400

        h_fecha = parse_date(data.get('h_fecha'))
        h_hora = parse_time(data.get('h_hora'))

        if not h_fecha or not h_hora:
            return jsonify({'error': 'Fecha y hora inválidas'}), 400

        result = db.session.execute(text("""
            INSERT INTO public.horario (actoliturgicoid, h_fecha, h_hora)
            VALUES (:actoliturgicoid, :h_fecha, :h_hora)
            RETURNING horarioid, created_at, updated_at
        """), {
            'actoliturgicoid': data.get('actoliturgicoid'),
            'h_fecha': h_fecha,
            'h_hora': h_hora
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
                a.parroquiaid,
                p.par_nombre as parroquia_nombre,
                h.created_at,
                h.updated_at,
                COALESCE(COUNT(r.reservaid), 0) as reservas_total
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            WHERE h.horarioid = :id
            GROUP BY h.horarioid, h.actoliturgicoid, a.act_nombre, a.act_titulo, h.h_fecha, h.h_hora, a.parroquiaid, p.par_nombre, h.created_at, h.updated_at
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
                'reservas_total': 0,  # Un horario nuevo no tiene reservas aún
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
                r.pagoid,
                r.res_persona_nombre,
                r.res_descripcion,
                r.created_at,
                r.updated_at,
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COALESCE(
                    per.per_nombres || ' ' || per.per_apellidos,
                    r.res_persona_nombre
                ) as persona_nombre,
                -- Estado del pago: si pagoid es NULL → 'pendiente', sino pago_estado
                COALESCE(pg.pago_estado, 'pendiente') as pago_estado,
                COALESCE(pg.pago_estado, 'pendiente') as estado_texto
            FROM public.reserva r
            LEFT JOIN public.horario h ON r.horarioid = h.horarioid
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.persona per ON r.personaid = per.personaid
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            ORDER BY r.created_at DESC
        """)).fetchall()

        result = []
        for row in items:
            result.append({
                'reservaid': row.reservaid,
                'id': row.reservaid,  # Agregar alias 'id' para compatibilidad
                'horarioid': row.horarioid,
                'personaid': row.personaid,
                'pagoid': row.pagoid,
                'res_persona_nombre': row.res_persona_nombre,
                'persona_nombre': row.persona_nombre,
                'res_descripcion': row.res_descripcion,
                'pago_estado': row.pago_estado,  # Estado del pago desde tabla pago
                'estado_texto': row.estado_texto.capitalize() if row.estado_texto else 'Pendiente',
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

        # Antes: res_descripcion era requerido. Ahora es opcional (nullable).
        required = [
            data.get('horarioid'),
            # data.get('res_descripcion')  # <-- ya no obligatorio
        ]

        if any(v in [None, '', False] for v in required):
            return jsonify({'success': False, 'error': 'horarioid es requerido'}), 400

        # Determinar si es persona registrada o no registrada
        persona_nombre = data.get('persona_nombre', '').strip()
        personaid = None

        # Si hay persona_nombre, buscar si existe en la BD
        if persona_nombre:
            persona_existente = db.session.execute(text("""
                SELECT personaid FROM public.persona 
                WHERE CONCAT(per_nombres, ' ', per_apellidos) ILIKE :nombre
                LIMIT 1
            """), {'nombre': persona_nombre}).fetchone()
            
            if persona_existente:
                personaid = persona_existente.personaid
        
        # No manejar res_estado aquí - se obtiene dinámicamente de tabla pago

        # Si hay datos de pago, crear pago primero y luego reserva con pagoid
        pagoid = data.get('pagoid')
        pago_data = None

        # Si vienen datos de pago en la request, crear el pago primero
        if any(key in data for key in ['pago_medio', 'pago_monto', 'pago_descripcion', 'pago_fecha']):
            try:
                # Crear pago
                from app.models import Pago
                from datetime import datetime

                pago = Pago(
                    pago_medio=data.get('pago_medio'),
                    pago_monto=float(data.get('pago_monto')),
                    pago_estado=data.get('pago_estado', 'pagado'),
                    pago_descripcion=data.get('pago_descripcion', ''),
                    pago_fecha=datetime.fromisoformat(data.get('pago_fecha', datetime.now().isoformat()).replace('Z', '+00:00')),
                    pago_confirmado=datetime.fromisoformat(data.get('pago_fecha', datetime.now().isoformat()).replace('Z', '+00:00')),
                    pago_expira=datetime.fromisoformat(data.get('pago_fecha', datetime.now().isoformat()).replace('Z', '+00:00')) + timedelta(hours=24)  # Expira en 24 horas
                )
                db.session.add(pago)
                db.session.flush()  # Para obtener el pagoid
                pagoid = pago.pagoid
                pago_data = pago

                print(f"✅ [BACKEND] Pago creado con ID: {pagoid}")

            except Exception as e:
                print(f"❌ [BACKEND] Error creando pago: {str(e)}")
                db.session.rollback()
                return jsonify({'error': 'Error creando pago'}), 500

        result = db.session.execute(text("""
            INSERT INTO public.reserva (horarioid, personaid, res_persona_nombre, res_descripcion, pagoid)
            VALUES (:horarioid, :personaid, :res_persona_nombre, :res_descripcion, :pagoid)
            RETURNING reservaid, created_at, updated_at
        """), {
            'horarioid': data.get('horarioid'),
            'personaid': personaid,
            'res_persona_nombre': persona_nombre if not personaid else None,
            # Permitir que res_descripcion sea NULL si no se envía
            'res_descripcion': (data.get('res_descripcion') if data.get('res_descripcion') is not None else None),
            'pagoid': pagoid
        })

        db.session.commit()
        new_id = result.fetchone()

        print(f"✅ [BACKEND] Reserva creada con ID: {new_id.reservaid}")

        # Obtener la reserva creada completa
        reserva = db.session.execute(text("""
            SELECT
                r.reservaid,
                r.horarioid,
                r.personaid,
                r.pagoid,
                r.res_persona_nombre,
                r.res_descripcion,
                r.created_at,
                r.updated_at,
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COALESCE(
                    per.per_nombres || ' ' || per.per_apellidos,
                    r.res_persona_nombre
                ) as persona_nombre,
                -- Estado del pago: si pagoid es NULL → 'pendiente', sino pago_estado
                COALESCE(pg.pago_estado, 'pendiente') as pago_estado,
                COALESCE(pg.pago_estado, 'pendiente') as estado_texto
            FROM public.reserva r
            LEFT JOIN public.horario h ON r.horarioid = h.horarioid
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.persona per ON r.personaid = per.personaid
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            WHERE r.reservaid = :id
        """), {'id': new_id.reservaid}).fetchone()

        # Si también se creó un pago, incluir sus datos en la respuesta
        pago_info = None
        if pago_data:
            pago_info = {
                'pagoid': pago_data.pagoid,
                'pago_medio': pago_data.pago_medio,
                'pago_monto': float(pago_data.pago_monto),
                'pago_estado': pago_data.pago_estado,
                'pago_descripcion': pago_data.pago_descripcion,
                'pago_fecha': pago_data.pago_fecha.isoformat(),
                'pago_confirmado': pago_data.pago_confirmado.isoformat() if pago_data.pago_confirmado else None,
                'created_at': pago_data.created_at.isoformat()
            }
            print(f"✅ [BACKEND] Pago incluido en respuesta: {pago_info}")

        return jsonify({
            'item': {
                'reservaid': reserva.reservaid,
                'horarioid': reserva.horarioid,
                'personaid': reserva.personaid,
                'pagoid': reserva.pagoid,
                'res_persona_nombre': reserva.res_persona_nombre,
                'persona_nombre': reserva.persona_nombre,
                'res_descripcion': reserva.res_descripcion,
                'pago_estado': reserva.pago_estado,
                'estado_texto': reserva.estado_texto.capitalize() if reserva.estado_texto else 'Pendiente',
                'h_fecha': reserva.h_fecha.isoformat() if reserva.h_fecha else None,
                'h_hora': reserva.h_hora.strftime('%H:%M') if reserva.h_hora else None,
                'acto_nombre': reserva.act_nombre,
                'acto_titulo': reserva.act_titulo,
                'parroquia_nombre': reserva.parroquia_nombre,
                'created_at': reserva.created_at.isoformat() if reserva.created_at else None,
                'updated_at': reserva.updated_at.isoformat() if reserva.updated_at else None
            },
            'pago': pago_info
        }), 201

    except Exception as e:
        print('Error create_reserva', e)
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Error interno'}), 500

@liturgical_bp.route('/reservas/<int:reservaid>', methods=['PUT'])
@jwt_required()
def update_reserva(reservaid):
    """Actualiza una reserva"""
    try:
        data = request.get_json() or {}
        
        # Determinar si es persona registrada o no registrada
        # IMPORTANTE: Ignorar personaid del frontend, siempre buscar por nombre
        persona_nombre = data.get('persona_nombre', '').strip()
        personaid = None
        
        # Si hay persona_nombre, buscar si existe en la BD
        if persona_nombre:
            persona_existente = db.session.execute(text("""
                SELECT personaid FROM public.persona 
                WHERE CONCAT(per_nombres, ' ', per_apellidos) ILIKE :nombre
                LIMIT 1
            """), {'nombre': persona_nombre}).fetchone()
            
            if persona_existente:
                personaid = persona_existente.personaid
        
        # No manejar res_estado aquí - se obtiene dinámicamente de tabla pago
        
        result = db.session.execute(text("""
            UPDATE public.reserva
            SET horarioid = :horarioid,
                personaid = :personaid,
                res_persona_nombre = :res_persona_nombre,
                res_descripcion = :res_descripcion,
                updated_at = NOW()
            WHERE reservaid = :id
            RETURNING reservaid
        """), {
            'id': reservaid,
            'horarioid': data.get('horarioid'),
            'personaid': personaid,
            'res_persona_nombre': persona_nombre if not personaid else None,
            'res_descripcion': (data.get('res_descripcion') or '').strip()
        })
        
        updated = result.fetchone()
        db.session.commit()
        
        if not updated:
            return jsonify({'error': 'Reserva no encontrada'}), 404
        
        # Obtener la reserva actualizada completa
        reserva = db.session.execute(text("""
            SELECT
                r.reservaid,
                r.horarioid,
                r.personaid,
                r.pagoid,
                r.res_persona_nombre,
                r.res_descripcion,
                r.created_at,
                r.updated_at,
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COALESCE(
                    per.per_nombres || ' ' || per.per_apellidos,
                    r.res_persona_nombre
                ) as persona_nombre,
                -- Estado del pago: si pagoid es NULL → 'pendiente', sino pago_estado
                COALESCE(pg.pago_estado, 'pendiente') as pago_estado,
                COALESCE(pg.pago_estado, 'pendiente') as estado_texto
            FROM public.reserva r
            LEFT JOIN public.horario h ON r.horarioid = h.horarioid
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.persona per ON r.personaid = per.personaid
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            WHERE r.reservaid = :id
        """), {'id': reservaid}).fetchone()
        
        return jsonify({
            'success': True,
            'item': {
                'reservaid': reserva.reservaid,
                'id': reserva.reservaid,  # Alias para compatibilidad
                'horarioid': reserva.horarioid,
                'personaid': reserva.personaid,
                'pagoid': reserva.pagoid,
                'res_persona_nombre': reserva.res_persona_nombre,
                'persona_nombre': reserva.persona_nombre,
                'res_descripcion': reserva.res_descripcion,
                'pago_estado': reserva.pago_estado,
                'estado_texto': reserva.estado_texto.capitalize() if reserva.estado_texto else 'Pendiente',
                'h_fecha': reserva.h_fecha.isoformat() if reserva.h_fecha else None,
                'h_hora': reserva.h_hora.strftime('%H:%M') if reserva.h_hora else None,
                'acto_nombre': reserva.act_nombre,
                'acto_titulo': reserva.act_titulo,
                'parroquia_nombre': reserva.parroquia_nombre,
                'created_at': reserva.created_at.isoformat() if reserva.created_at else None,
                'updated_at': reserva.updated_at.isoformat() if reserva.updated_at else None
            }
        }), 200
    
    except Exception as e:
        print('Error update_reserva', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reservas/<int:reservaid>', methods=['DELETE'])
@jwt_required()
def delete_reserva(reservaid):
    """Elimina una reserva"""
    try:
        result = db.session.execute(text("""
            DELETE FROM public.reserva
            WHERE reservaid = :id
            RETURNING reservaid
        """), {'id': reservaid})
        
        deleted = result.fetchone()
        db.session.commit()
        
        if not deleted:
            return jsonify({'error': 'Reserva no encontrada'}), 404
        
        return jsonify({'success': True, 'message': 'Reserva eliminada correctamente'}), 200
    
    except Exception as e:
        print('Error delete_reserva', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

# =========================================================
# CONSULTAS ESPECÍFICAS PARA EL CALENDARIO
# =========================================================

@liturgical_bp.route('/calendario', methods=['GET'])
@jwt_required()
def get_calendario():
    """Obtiene eventos para el calendario (últimos 30 días y próximos 60 días)"""
    try:
        items = db.session.execute(text("""
            SELECT
                h.h_fecha,
                h.h_hora,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COUNT(r.reservaid) as reservas_count,
                COUNT(CASE WHEN COALESCE(pg.pago_estado, 'pendiente') IN ('pendiente', 'pagado') THEN 1 END) as reservas_activas_count,
                h.horarioid,
                a.actoliturgicoid
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            WHERE h.h_fecha >= CURRENT_DATE - INTERVAL '30 days'
              AND h.h_fecha < CURRENT_DATE + INTERVAL '60 days'
              AND a.act_estado = TRUE
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
                COUNT(CASE WHEN COALESCE(pg.pago_estado, 'pendiente') IN ('pendiente', 'pagado') THEN 1 END) as reservas_activas
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            WHERE h.h_fecha = :fecha
            GROUP BY h.horarioid, h.actoliturgicoid, a.act_nombre, a.act_titulo, p.par_nombre
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
