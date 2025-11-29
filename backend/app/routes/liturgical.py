from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, verify_jwt_in_request
from datetime import datetime, timedelta
from sqlalchemy import text
from app import db
from app.models import ActoLiturgico, Horario, Reserva
from app.utils.permissions import permission_required, has_permission



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

# Enforce permisos para todo el blueprint litúrgico
@liturgical_bp.before_request
def _enforce_liturgico_permission():
    # Permitir preflight CORS sin autenticación
    if request.method == 'OPTIONS':
        return None

    # Requiere JWT y al menos un permiso litúrgico
    verify_jwt_in_request()
    allowed = (
        has_permission('liturgico')
        or has_permission('liturgico_actos')
        or has_permission('liturgico_horarios')
        or has_permission('liturgico_reservas')
        or has_permission('liturgico_reportes')
    )
    if not allowed:
        return jsonify({
            'error': 'Forbidden',
            'message': 'Permiso requerido: liturgico_*'
        }), 403

# =========================================================
# ACTOS LITÚRGICOS CON HORARIO (OPERACIÓN COMBINADA)
# =========================================================

@liturgical_bp.route('/actos-con-horario', methods=['POST'])
@jwt_required()
@permission_required('liturgico_actos', 'liturgico_actos_crear')
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
            return jsonify({'error': 'Fecha y hora invǭlidas'}), 400

        # Fecha y hora final: si no se envían, usar las de inicio
        h_fecha_fin = parse_date(data.get('h_fecha_fin') or data.get('h_fecha'))
        h_hora_fin = parse_time(data.get('h_hora_fin') or data.get('h_hora'))

        if not h_fecha_fin or not h_hora_fin:
            return jsonify({'error': 'Fecha y hora invalidas 1'}), 400
        print('[create_acto_con_horario] data recibido:', data)
        print('[create_acto_con_horario] fechas calculadas:', {
            'h_fecha': h_fecha,
            'h_hora': h_hora,
            'h_fecha_fin': h_fecha_fin,
            'h_hora_fin': h_hora_fin,
        })

        # Validar que la fecha/hora final no sea anterior a la inicial
        inicio_dt = datetime.combine(h_fecha, h_hora)
        fin_dt = datetime.combine(h_fecha_fin, h_hora_fin)
        if fin_dt < inicio_dt:
            return jsonify({
                'error': 'La fecha/hora final debe ser mayor o igual a la inicial'
            }), 400

        # Iniciar transacción
        acto_id = None
        horario_id = None

        try:
            # 1. Crear el acto litúrgico
            # Preparar max_reservas
            max_res = data.get('act_max_reservas')
            if max_res is not None and str(max_res).strip():
                try:
                    max_res = int(max_res)
                except ValueError:
                    max_res = None
            else:
                max_res = None

            acto_result = db.session.execute(text("""
                INSERT INTO public.actoliturgico (parroquiaid, act_nombre, act_titulo, act_descripcion, act_estado, act_max_reservas)
                VALUES (:parroquiaid, :act_nombre, :act_titulo, :act_descripcion, :act_estado, :act_max_reservas)
                RETURNING actoliturgicoid
            """), {
                'parroquiaid': data.get('parroquiaid'),
                'act_nombre': (data.get('act_nombre') or '').strip(),
                'act_titulo': (data.get('act_titulo') or '').strip(),
                'act_descripcion': (data.get('act_descripcion') or '').strip() or None,
                'act_estado': bool(data.get('act_estado', True)),
                'act_max_reservas': max_res
            })

            acto_id = acto_result.fetchone().actoliturgicoid

            # 2. Crear el horario asociado (rango inicio/fin)
            horario_result = db.session.execute(text("""
                INSERT INTO public.horario (
                    actoliturgicoid,
                    h_fecha,
                    h_hora,
                    h_fecha_fin,
                    h_hora_fin
                )
                VALUES (
                    :actoliturgicoid,
                    :h_fecha,
                    :h_hora,
                    :h_fecha_fin,
                    :h_hora_fin
                )
                RETURNING horarioid
            """), {
                'actoliturgicoid': acto_id,
                'h_fecha': h_fecha,
                'h_hora': h_hora,
                'h_fecha_fin': h_fecha_fin,
                'h_hora_fin': h_hora_fin, 
                
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
                    h.h_fecha_fin,
                    h.h_hora_fin,
                    h.created_at as horario_created_at,
                    h.updated_at as horario_updated_at
                FROM public.actoliturgico a
                LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
                LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
                WHERE a.actoliturgicoid = :acto_id
            """), {'acto_id': acto_id}).fetchone()
            print('[create_acto_con_horario] resultado SELECT:', {
                'actoliturgicoid': resultado.actoliturgicoid,
                'parroquiaid': resultado.parroquiaid,
                'h_fecha': resultado.h_fecha,
                'h_hora': resultado.h_hora,
                'h_fecha_fin': getattr(resultado, 'h_fecha_fin', None),
                'h_hora_fin': getattr(resultado, 'h_hora_fin', None),
            })

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
                    'h_fecha_fin': resultado.h_fecha_fin.isoformat() if resultado.h_fecha_fin else None,
                    'h_hora_fin': resultado.h_hora_fin.strftime('%H:%M') if resultado.h_hora_fin else None,
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
                a.act_max_reservas,
                a.created_at,
                a.updated_at,
                h.horarioid,
                h.h_fecha,
                h.h_hora,
                h.h_fecha_fin,
                h.h_hora_fin,
                h.created_at as horario_created_at,
                COALESCE(COUNT(DISTINCT r.reservaid), 0) as reservas_total
            FROM public.actoliturgico a
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            WHERE a.act_estado = TRUE
            GROUP BY a.actoliturgicoid, a.parroquiaid, p.par_nombre, a.act_nombre, a.act_titulo, 
                     a.act_descripcion, a.act_estado, a.act_max_reservas, a.created_at, a.updated_at,
                     h.horarioid, h.h_fecha, h.h_hora, h.h_fecha_fin, h.h_hora_fin, h.created_at
            ORDER BY a.actoliturgicoid DESC
        """)).fetchall()
        print('[list_actos] total items:', len(items))
        for row in items:
            print('[list_actos] item:', {
                'id': row.actoliturgicoid,
                'parroquiaid': row.parroquiaid,
                'h_fecha': row.h_fecha,
                'h_hora': row.h_hora,
                'h_fecha_fin': getattr(row, 'h_fecha_fin', None),
                'h_hora_fin': getattr(row, 'h_hora_fin', None),
                'reservas_total': row.reservas_total,
            })

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
                'act_max_reservas': row.act_max_reservas,
                'reservas_total': row.reservas_total,
                'horarioid': row.horarioid,
                'h_fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'h_hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'h_fecha_fin': row.h_fecha_fin.isoformat() if row.h_fecha_fin else None,
                'h_hora_fin': row.h_hora_fin.strftime('%H:%M') if row.h_hora_fin else None,                
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None
            })
        
        print('[list_actos] sending items:', result)
        return jsonify({'items': result}), 200
    except Exception as e:
        print('Error list_actos', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/actos/<int:acto_id>', methods=['PUT'])
@jwt_required()
@permission_required('liturgico_actos', 'liturgico_actos_editar')
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
        if 'act_max_reservas' in data:
            set_parts_acto.append('act_max_reservas = :act_max_reservas')
            max_res = data.get('act_max_reservas')
            if max_res is not None and str(max_res).strip():
                try:
                    max_res = int(max_res)
                except ValueError:
                    max_res = None
            else:
                max_res = None
            params['act_max_reservas'] = max_res

        if not set_parts_acto:
            return jsonify({'error': 'No hay datos para actualizar'}), 400

        set_clause_acto = ', '.join(set_parts_acto)

        # Iniciar transacción
        try:
            # 1. Actualizar el acto litúrgico
            query_acto = f'UPDATE public.actoliturgico SET {set_clause_acto} WHERE actoliturgicoid = :id'
            result_acto = db.session.execute(text(query_acto), params)

            # 2. Actualizar horario si hay cambios en fecha/hora
            if 'h_fecha' in data or 'h_hora' in data or 'h_fecha_fin' in data or 'h_hora_fin' in data:
                h_fecha = None
                h_hora = None
                h_fecha_fin = None
                h_hora_fin = None

                if 'h_fecha' in data and data.get('h_fecha'):
                    h_fecha = parse_date(data.get('h_fecha'))
                if 'h_hora' in data and data.get('h_hora'):
                    h_hora = parse_time(data.get('h_hora'))
                if 'h_fecha_fin' in data and data.get('h_fecha_fin'):
                    h_fecha_fin = parse_date(data.get('h_fecha_fin'))
                if 'h_hora_fin' in data and data.get('h_hora_fin'):
                    h_hora_fin = parse_time(data.get('h_hora_fin'))

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
                            SET h_fecha = :h_fecha, h_hora = :h_hora, h_fecha_fin = :h_fecha_fin, h_hora_fin = :h_hora_fin
                            WHERE actoliturgicoid = :acto_id
                        """), {
                            'acto_id': acto_id,
                            'h_fecha': h_fecha,
                            'h_hora': h_hora,
                            'h_fecha_fin': h_fecha_fin,
                            'h_hora_fin': h_hora_fin
                        })
                    else:
                        # Crear nuevo horario
                        db.session.execute(text("""
                            INSERT INTO public.horario (actoliturgicoid, h_fecha, h_hora, h_fecha_fin, h_hora_fin)
                            VALUES (:actoliturgicoid, :h_fecha, :h_hora, :h_fecha_fin, :h_hora_fin)
                        """), {
                            'actoliturgicoid': acto_id,
                            'h_fecha': h_fecha,
                            'h_hora': h_hora,
                            'h_fecha_fin': h_fecha_fin,
                            'h_hora_fin': h_hora_fin
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
                    a.act_max_reservas,
                    a.created_at,
                    a.updated_at,
                    h.horarioid,
                    h.h_fecha,
                    h.h_hora,
                    h.h_fecha_fin,
                    h.h_hora_fin,
                    h.created_at as horario_created_at                   
                FROM public.actoliturgico a
                LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
                LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
                WHERE a.actoliturgicoid = :id
            """), {'id': acto_id}).fetchone()

            return jsonify({
                'success': True,
                'message': 'Acto actualizado correctamente',
                'item': {
                    'actoliturgicoid': acto.actoliturgicoid,
                    'parroquiaid': acto.parroquiaid,
                    'parroquia_nombre': acto.parroquia_nombre,
                    'act_nombre': acto.act_nombre,
                    'act_titulo': acto.act_titulo,
                    'act_descripcion': acto.act_descripcion,
                    'act_estado': acto.act_estado,
                    'act_max_reservas': acto.act_max_reservas,
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
@permission_required('liturgico_actos', 'liturgico_actos_eliminar')
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
                a.act_max_reservas,
                h.h_fecha,
                h.h_hora,
                h.h_fecha_fin,
                h.h_hora_fin,
                h.created_at as horario_created_at,                        
                a.parroquiaid,
                p.par_nombre as parroquia_nombre,
                COALESCE(COUNT(r.reservaid), 0) as reservas_total
            FROM public.horario h
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            {where_sql}
            GROUP BY h.horarioid, h.actoliturgicoid, a.act_nombre, a.act_titulo, a.act_max_reservas, h.h_fecha, h.h_hora, h.h_fecha_fin, h.h_hora_fin, a.parroquiaid, p.par_nombre
            ORDER BY h.h_fecha DESC, h.h_hora DESC
        """), params).fetchall()

        result = []
        for row in items:
            result.append({
                'horarioid': row.horarioid,
                'actoliturgicoid': row.actoliturgicoid,
                'acto_nombre': row.act_nombre,
                'acto_titulo': row.act_titulo,
                'act_max_reservas': row.act_max_reservas,
                'h_fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'h_hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'h_fecha_fin': row.h_fecha_fin.isoformat() if row.h_fecha_fin else None,
                'h_hora_fin': row.h_hora_fin.strftime('%H:%M') if row.h_hora_fin else None,             
                'parroquiaid': row.parroquiaid,
                'parroquia_nombre': row.parroquia_nombre,
                'reservas_total': row.reservas_total,
                'disponibles': (row.act_max_reservas - row.reservas_total) if row.act_max_reservas else None,
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
            return jsonify({'error': 'Fecha y hora invǭlidas'}), 400

        # Fecha y hora final: si no se envían, usar las de inicio
        h_fecha_fin = parse_date(data.get('h_fecha_fin') or data.get('h_fecha'))
        h_hora_fin = parse_time(data.get('h_hora_fin') or data.get('h_hora'))

        if not h_fecha_fin or not h_hora_fin:
            return jsonify({'error': 'Fecha y hora invalidotas..'}), 400
        print('[create_acto_con_horario] data recibido:', data)
        print('[create_acto_con_horario] fechas calculadas:', {
            'h_fecha': h_fecha,
            'h_hora': h_hora,
            'h_fecha_fin': h_fecha_fin,
            'h_hora_fin': h_hora_fin,
        })

        # Validar que la fecha/hora final no sea anterior a la inicial
        inicio_dt = datetime.combine(h_fecha, h_hora)
        fin_dt = datetime.combine(h_fecha_fin, h_hora_fin)
        if fin_dt < inicio_dt:
            return jsonify({
                'error': 'La fecha/hora final debe ser mayor o igual a la inicial'
            }), 400
        

        #inciar transacción
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
                h.h_fecha_fin,
                h.h_hora_fin,
                h.created_at as horario_created_at,
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
@permission_required('liturgico_reservas_ver', 'liturgico_reservas', 'liturgico')
def list_reservas():
    """Lista todas las reservas de actos litúrgicos"""
    from app.models import User, Persona
    from flask_jwt_extended import get_jwt_identity

    try:
        # --- LÓGICA DE PERMISOS POR ROL ---
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        user_role = (user.role if user else '').lower()
        is_admin = user_role in ('administrador', 'admin')

        user_parroquia_id = None
        if not is_admin:
            persona = Persona.query.filter_by(userid=user.id).first()
            if persona:
                user_parroquia_id = persona.parroquiaid
        # --- FIN LÓGICA DE PERMISOS ---

        # Obtener parámetros de filtro
        personaid = request.args.get('personaid', type=int)
        parroquiaid_from_request = request.args.get('parroquiaid', type=int)

        params = {}
        where_clauses = []

        # Si se especifica personaid (rol Usuario), filtrar por múltiples criterios
        if personaid:
            try:
                # Obtener información completa de la persona y usuario
                persona_obj = Persona.query.get(personaid)
                if persona_obj:
                    # Obtener datos del usuario asociado
                    user_obj = User.query.get(persona_obj.userid) if persona_obj.userid else None
                    
                    persona_nombre_completo = f"{persona_obj.per_nombres} {persona_obj.per_apellidos}".strip()
                    
                    # Construir condición OR con múltiples criterios de coincidencia
                    match_conditions = []
                    
                    # Siempre agregar filtro por personaid
                    match_conditions.append("r.personaid = :personaid")
                    params['personaid'] = personaid
                    
                    # Filtro por nombre completo
                    if persona_nombre_completo:
                        match_conditions.append("LOWER(TRIM(r.res_persona_nombre)) = LOWER(:persona_nombre)")
                        params['persona_nombre'] = persona_nombre_completo
                    
                    # Agregar email si existe
                    if user_obj and user_obj.email:
                        match_conditions.append("LOWER(TRIM(r.res_persona_nombre)) = LOWER(:user_email)")
                        params['user_email'] = user_obj.email
                    
                    # Agregar nombre de usuario si existe
                    if user_obj and user_obj.name:
                        match_conditions.append("LOWER(TRIM(r.res_persona_nombre)) = LOWER(:user_name)")
                        params['user_name'] = user_obj.name
                    
                    where_clauses.append(f"({' OR '.join(match_conditions)})")
                    
                    print(f'📋 [list_reservas] Filtrando Usuario por: personaid={personaid}, nombre="{persona_nombre_completo}", email={user_obj.email if user_obj else None}, username={user_obj.name if user_obj else None}')
                    print(f'📋 [list_reservas] Condiciones: {match_conditions}')
                else:
                    where_clauses.append("r.personaid = :personaid")
                    params['personaid'] = personaid
            except Exception as e:
                print(f'❌ [list_reservas] Error al construir filtro Usuario: {e}')
                # Fallback a filtro simple
                where_clauses.append("r.personaid = :personaid")
                params['personaid'] = personaid
        
        # Forzar filtro de parroquia SOLO para no-admins que NO sean Usuario
        # Usuario ya tiene su filtro por personaid, no necesita filtro de parroquia
        if not personaid:  # Si NO se está filtrando por personaid (no es Usuario)
            if user_parroquia_id:
                where_clauses.append("a.parroquiaid = :parroquiaid")
                params['parroquiaid'] = user_parroquia_id
            elif is_admin and parroquiaid_from_request:
                where_clauses.append("a.parroquiaid = :parroquiaid")
                params['parroquiaid'] = parroquiaid_from_request

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        query = text(f"""
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
                h.h_fecha_fin,
                h.h_hora_fin,
                a.act_nombre,
                a.act_titulo,
                a.parroquiaid,
                p.par_nombre as parroquia_nombre,
                COALESCE(
                    per.per_nombres || ' ' || per.per_apellidos,
                    r.res_persona_nombre
                ) as persona_nombre,
                pg.pago_medio,
                pg.pago_monto,
                COALESCE(pg.pago_estado, 'pendiente') as pago_estado,
                pg.pago_descripcion
            FROM public.reserva r
            LEFT JOIN public.horario h ON r.horarioid = h.horarioid
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.persona per ON r.personaid = per.personaid
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            {where_sql}
            ORDER BY r.created_at DESC
        """)

        items = db.session.execute(query, params).fetchall()

        print(f'📋 [list_reservas] Params: {params}')
        print(f'📋 [list_reservas] WHERE: {where_sql}')
        print(f'📋 [list_reservas] Items encontrados: {len(items)}')

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
                'h_fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'h_hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'h_fecha_fin': row.h_fecha_fin.isoformat() if row.h_fecha_fin else None,
                'h_hora_fin': row.h_hora_fin.strftime('%H:%M') if row.h_hora_fin else None,
                'acto_nombre': row.act_nombre,
                'acto_titulo': row.act_titulo,
                'parroquiaid': row.parroquiaid,
                'parroquia_nombre': row.parroquia_nombre,
                # Campos de pago (pueden ser NULL)
                'pago_medio': row.pago_medio if row.pagoid else None,
                'pago_monto': float(row.pago_monto) if row.pago_monto else None,
                'pago_estado': row.pago_estado,
                'pago_descripcion': row.pago_descripcion if row.pagoid else None,
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None
            })

        print(f'📋 [list_reservas] Retornando {len(result)} items')
        return jsonify({'items': result}), 200
    except Exception as e:
        print('Error list_reservas', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reservas', methods=['POST'])
@jwt_required()
@permission_required('liturgico_reservas_crear', 'liturgico_reservas', 'liturgico')
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

        # VALIDACIÓN: Verificar límite de reservas para el acto litúrgico
        # Contar TODAS las reservas (sin importar estado de pago)
        horarioid = data.get('horarioid')
        limite_check = db.session.execute(text("""
            SELECT 
                a.act_max_reservas,
                COUNT(r.reservaid) as reservas_actuales
            FROM public.horario h
            INNER JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.reserva r ON r.horarioid = h.horarioid
            WHERE h.horarioid = :horarioid
            GROUP BY a.act_max_reservas
        """), {'horarioid': horarioid}).fetchone()

        # Debug: Imprimir detalles de la validación
        print(f"🔍 [VALIDACIÓN CUPOS] horarioid={horarioid}")
        if limite_check:
            print(f"   ✅ act_max_reservas={limite_check.act_max_reservas}")
            print(f"   ✅ reservas_actuales={limite_check.reservas_actuales}")
        else:
            print(f"   ❌ No se encontró el horario")

        if limite_check and limite_check.act_max_reservas is not None and limite_check.act_max_reservas > 0:
            if limite_check.reservas_actuales >= limite_check.act_max_reservas:
                print(f"   🚫 RECHAZADO: {limite_check.reservas_actuales} >= {limite_check.act_max_reservas}")
                return jsonify({
                    'success': False,
                    'error': f'No hay cupos disponibles. Máximo de reservas: {limite_check.act_max_reservas}. Reservas actuales: {limite_check.reservas_actuales}',
                    'disponibles': 0,
                    'maximo': limite_check.act_max_reservas
                }), 400
            else:
                print(f"   ✅ Cupos disponibles: {limite_check.act_max_reservas - limite_check.reservas_actuales}")

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
                    pago_monto=float(data.get('pago_monto') or 0),
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
                h.h_fecha_fin,
                h.h_hora_fin,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COALESCE(
                    per.per_nombres || ' ' || per.per_apellidos,
                    r.res_persona_nombre
                ) as persona_nombre,
                pg.pago_medio,
                pg.pago_monto,
                COALESCE(pg.pago_estado, 'pendiente') as pago_estado,
                pg.pago_descripcion
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
                # Campos de pago (pueden ser NULL)
                'pago_medio': reserva.pago_medio if reserva.pagoid else None,
                'pago_monto': float(reserva.pago_monto) if reserva.pago_monto else None,
                'pago_estado': reserva.pago_estado if reserva.pagoid else 'pendiente',
                'pago_descripcion': reserva.pago_descripcion if reserva.pagoid else None,
                'h_fecha': reserva.h_fecha.isoformat() if reserva.h_fecha else None,
                'h_hora': reserva.h_hora.strftime('%H:%M') if reserva.h_hora else None,
                'h_fecha_fin': reserva.h_fecha_fin.isoformat() if reserva.h_fecha_fin else None,
                'h_hora_fin': reserva.h_hora_fin.strftime('%H:%M') if reserva.h_hora_fin else None,
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
@permission_required('liturgico_reservas_editar', 'liturgico_reservas', 'liturgico')
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
        
        # Verificar si la reserva tiene pago asociado
        current_reserva = db.session.execute(text("SELECT pagoid FROM public.reserva WHERE reservaid = :id"), {'id': reservaid}).fetchone()
        pagoid = current_reserva.pagoid if current_reserva else None

        # Si hay datos de pago (incluyendo solo cambio de estado)
        if data.get('pago_medio') or data.get('pago_monto') or data.get('pago_estado'):
            if pagoid:
                # Actualizar pago existente
                db.session.execute(text("""
                    UPDATE public.pago
                    SET pago_medio = COALESCE(:pago_medio, pago_medio),
                        pago_monto = COALESCE(:pago_monto, pago_monto),
                        pago_descripcion = COALESCE(:pago_descripcion, pago_descripcion),
                        pago_estado = COALESCE(:pago_estado, pago_estado),
                        updated_at = NOW()
                    WHERE pagoid = :pagoid
                """), {
                    'pagoid': pagoid,
                    'pago_medio': data.get('pago_medio'),
                    'pago_monto': float(data.get('pago_monto')) if data.get('pago_monto') else None,
                    'pago_descripcion': data.get('pago_descripcion'),
                    'pago_estado': data.get('pago_estado')
                })
            else:
                # Crear nuevo pago
                from app.models import Pago
                from datetime import datetime, timedelta
                
                try:
                    pago = Pago(
                        pago_medio=data.get('pago_medio'),
                        pago_monto=float(data.get('pago_monto', 0)),
                        pago_estado=data.get('pago_estado', 'pendiente'),
                        pago_descripcion=data.get('pago_descripcion', ''),
                        pago_fecha=datetime.now(),
                        pago_confirmado=datetime.now(),
                        pago_expira=datetime.now() + timedelta(hours=24)
                    )
                    db.session.add(pago)
                    db.session.flush()
                    pagoid = pago.pagoid
                except Exception as e:
                    print(f"❌ [BACKEND] Error creando pago en update: {str(e)}")

        result = db.session.execute(text("""
            UPDATE public.reserva
            SET horarioid = :horarioid,
                personaid = :personaid,
                res_persona_nombre = :res_persona_nombre,
                res_descripcion = :res_descripcion,
                pagoid = COALESCE(:pagoid, pagoid),
                updated_at = NOW()
            WHERE reservaid = :id
            RETURNING reservaid
        """), {
            'id': reservaid,
            'horarioid': data.get('horarioid'),
            'personaid': personaid,
            'res_persona_nombre': persona_nombre if not personaid else None,
            'res_descripcion': (data.get('res_descripcion') or '').strip(),
            'pagoid': pagoid
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
                h.h_fecha_fin,
                h.h_hora_fin,
                h.created_at as horario_created_at,
                a.act_nombre,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                COALESCE(
                    per.per_nombres || ' ' || per.per_apellidos,
                    r.res_persona_nombre
                ) as persona_nombre,
                pg.pago_medio,
                pg.pago_monto,
                COALESCE(pg.pago_estado, 'pendiente') as pago_estado,
                pg.pago_descripcion
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
                # Campos de pago (pueden ser NULL)
                'pago_medio': reserva.pago_medio if reserva.pagoid else None,
                'pago_monto': float(reserva.pago_monto) if reserva.pago_monto else None,
                'pago_estado': reserva.pago_estado if reserva.pagoid else 'pendiente',
                'pago_descripcion': reserva.pago_descripcion if reserva.pagoid else None,
                'h_fecha': reserva.h_fecha.isoformat() if reserva.h_fecha else None,
                'h_hora': reserva.h_hora.strftime('%H:%M') if reserva.h_hora else None,
                'h_fecha_fin': reserva.h_fecha_fin.isoformat() if reserva.h_fecha_fin else None,
                'h_hora_fin': reserva.h_hora_fin.strftime('%H:%M') if reserva.h_hora_fin else None,
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
@permission_required('liturgico_reservas_eliminar', 'liturgico_reservas', 'liturgico')
def delete_reserva(reservaid):
    """Elimina una reserva e incrementa el cupo máximo del acto"""
    try:
        # Obtener horarioid antes de borrar para saber qué acto actualizar
        reserva = db.session.execute(text("SELECT horarioid FROM public.reserva WHERE reservaid = :id"), {'id': reservaid}).fetchone()
        
        if not reserva:
            return jsonify({'error': 'Reserva no encontrada'}), 404

        # Eliminar reserva
        db.session.execute(text("""
            DELETE FROM public.reserva
            WHERE reservaid = :id
        """), {'id': reservaid})
        
        
        # NO incrementar act_max_reservas - es un valor fijo
        # Los cupos disponibles se calculan dinámicamente: act_max_reservas - reservas_actuales
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Reserva eliminada y cupo liberado'}), 200
    
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
                h.h_fecha_fin,
                h.h_hora_fin,
                h.created_at as horario_created_at,
                a.act_nombre,
                a.act_titulo,
                a.act_max_reservas,
                a.parroquiaid,
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
            GROUP BY h.h_fecha, h.h_hora, a.act_nombre, a.act_titulo, a.act_max_reservas, a.parroquiaid, p.par_nombre, h.horarioid, a.actoliturgicoid, h.h_fecha_fin, h.h_hora_fin, h.created_at
            ORDER BY h.h_fecha, h.h_hora
        """)).fetchall()

        result = []
        for row in items:
            result.append({
                'date': row.h_fecha.isoformat() if row.h_fecha else None,
                'time': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'date_end': row.h_fecha_fin.isoformat() if row.h_fecha_fin else None,
                'time_end': row.h_hora_fin.strftime('%H:%M') if row.h_hora_fin else None,
                'type': row.act_nombre,
                'title': row.act_titulo,
                'act_max_reservas': row.act_max_reservas,
                'parroquiaid': row.parroquiaid,
                'location': row.parroquia_nombre,
                'reservas_count': row.reservas_count,
                'reservas_activas_count': row.reservas_activas_count,
                'horarioid': row.horarioid,
                'actoliturgicoid': row.actoliturgicoid,
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
                h.h_fecha_fin,
                h.h_hora_fin,
                h.created_at as horario_created_at,                        
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
                'h_fecha_fin': row.h_fecha_fin.isoformat() if row.h_fecha_fin else None,
                'h_hora_fin': row.h_hora_fin.strftime('%H:%M') if row.h_hora_fin else None,
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

# =========================================================
# DEBUG: Endpoint temporal para revisar reservas
# =========================================================

@liturgical_bp.route('/debug/reservas/<int:horarioid>', methods=['GET'])
@jwt_required()
def debug_reservas_horario(horarioid):
    """DEBUG: Ver todas las reservas de un horario específico"""
    try:
        # Consulta todas las reservas
        reservas = db.session.execute(text("""
            SELECT 
                r.reservaid,
                r.horarioid,
                r.res_persona_nombre,
                r.res_descripcion,
                r.pagoid,
                COALESCE(pg.pago_estado, 'pendiente') as pago_estado,
                r.created_at,
                CASE WHEN COALESCE(pg.pago_estado, 'pendiente') IN ('pendiente', 'pagado') 
                     THEN 'ACTIVA' 
                     ELSE 'INACTIVA' 
                END as estado_reserva
            FROM public.reserva r
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            WHERE r.horarioid = :horarioid
            ORDER BY r.created_at DESC
        """), {'horarioid': horarioid}).fetchall()
        
        # Información del acto
        acto_info = db.session.execute(text("""
            SELECT 
                a.actoliturgicoid,
                a.act_nombre,
                a.act_titulo,
                a.act_max_reservas,
                h.horarioid,
                h.h_fecha,
                h.h_hora
            FROM public.horario h
            INNER JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            WHERE h.horarioid = :horarioid
        """), {'horarioid': horarioid}).fetchone()
        
        result = {
            'horarioid': horarioid,
            'acto_info': {
                'actoliturgicoid': acto_info.actoliturgicoid if acto_info else None,
                'act_nombre': acto_info.act_nombre if acto_info else None,
                'act_titulo': acto_info.act_titulo if acto_info else None,
                'act_max_reservas': acto_info.act_max_reservas if acto_info else None,
                'h_fecha': acto_info.h_fecha.isoformat() if acto_info and acto_info.h_fecha else None,
                'h_hora': acto_info.h_hora.strftime('%H:%M') if acto_info and acto_info.h_hora else None,
            },
            'reservas': [],
            'resumen': {
                'total': len(reservas),
                'activas': 0,
                'inactivas': 0
            }
        }
        
        for r in reservas:
            reserva_dict = {
                'reservaid': r.reservaid,
                'persona_nombre': r.res_persona_nombre,
                'descripcion': r.res_descripcion,
                'pagoid': r.pagoid,
                'pago_estado': r.pago_estado,
                'estado_reserva': r.estado_reserva,
                'created_at': r.created_at.isoformat() if r.created_at else None
            }
            result['reservas'].append(reserva_dict)
            
            if r.estado_reserva == 'ACTIVA':
                result['resumen']['activas'] += 1
            else:
                result['resumen']['inactivas'] += 1
        
        return jsonify(result), 200
    except Exception as e:
        print('Error debug_reservas_horario', e)
        return jsonify({'error': str(e)}), 500

# =========================================================
# ENDPOINT PARA DASHBOARD
# =========================================================

@liturgical_bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Obtiene estadísticas clave para el dashboard principal."""
    try:
        # 1. Total de miembros (personas)
        miembros_activos = db.session.execute(text("SELECT COUNT(*) FROM public.persona")).scalar_one_or_none() or 0

        # 2. Eventos (horarios) este mes
        eventos_mes = db.session.execute(text("""
            SELECT COUNT(*) FROM public.horario
            WHERE h_fecha >= date_trunc('month', CURRENT_DATE)
              AND h_fecha < date_trunc('month', CURRENT_DATE) + interval '1 month'
        """)).scalar_one_or_none() or 0

        # 3. Total de reservas
        total_reservas = db.session.execute(text("SELECT COUNT(*) FROM public.reserva")).scalar_one_or_none() or 0

        # 4. Ingresos totales (solo pagos confirmados)
        ingresos_totales = db.session.execute(text("""
            SELECT COALESCE(SUM(pago_monto), 0) 
            FROM public.pago 
            WHERE pago_estado = 'pagado'
        """)).scalar_one_or_none() or 0

        return jsonify({
            'stats': {
                'miembros_activos': miembros_activos,
                'eventos_este_mes': eventos_mes,
                'total_reservas': total_reservas,
                'ingresos_totales': float(ingresos_totales)
            }
        }), 200

    except Exception as e:
        print(f"❌ Error en get_dashboard_stats: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# =========================================================
# ENDPOINTS PARA REPORTES
# =========================================================

@liturgical_bp.route('/reports/parish-activity', methods=['GET'])
@jwt_required()
@permission_required('liturgico_reportes')
def get_parish_activity_report():
    """
    Genera un reporte de actividad por parroquia.
    - Admins ven todas las parroquias.
    - Otros roles ven solo su parroquia.
    """
    from app.models import User, Persona
    from flask_jwt_extended import get_jwt_identity

    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        user_role = (user.role if user else '').lower()
        is_admin = user_role in ('administrador', 'admin')

        user_parroquia_id = None
        if not is_admin:
            persona = Persona.query.filter_by(userid=user.id).first()
            if persona:
                user_parroquia_id = persona.parroquiaid

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        params = {}

        where_parroquia = ""
        if user_parroquia_id:
            where_parroquia = "WHERE p.parroquiaid = :user_parroquia_id"
            params['user_parroquia_id'] = user_parroquia_id

        # Construir condiciones de fecha para los CASE
        date_condition = ""
        if start_date and end_date:
            date_condition = "AND h.h_fecha >= :start_date AND h.h_fecha <= :end_date"
            params['start_date'] = start_date
            params['end_date'] = end_date
        elif start_date:
            date_condition = "AND h.h_fecha >= :start_date"
            params['start_date'] = start_date
        elif end_date:
            date_condition = "AND h.h_fecha <= :end_date"
            params['end_date'] = end_date

        query = text(f"""
            SELECT 
                p.parroquiaid,
                p.par_nombre,
                COALESCE(
                    COUNT(DISTINCT CASE 
                        WHEN h.horarioid IS NOT NULL {date_condition}
                        THEN h.horarioid 
                    END), 
                0) as total_eventos,
                COALESCE(
                    COUNT(DISTINCT CASE 
                        WHEN r.reservaid IS NOT NULL {date_condition}
                        THEN r.reservaid 
                    END), 
                0) as total_reservas,
                COALESCE(
                    SUM(CASE 
                        WHEN pg.pago_estado = 'pagado' {date_condition}
                        THEN pg.pago_monto 
                        ELSE 0 
                    END), 
                0) as ingresos_totales
            FROM public.parroquia p
            LEFT JOIN public.actoliturgico a ON p.parroquiaid = a.parroquiaid
            LEFT JOIN public.horario h ON a.actoliturgicoid = h.actoliturgicoid
            LEFT JOIN public.reserva r ON h.horarioid = r.horarioid
            LEFT JOIN public.pago pg ON r.pagoid = pg.pagoid
            {where_parroquia}
            GROUP BY p.parroquiaid, p.par_nombre
            ORDER BY p.par_nombre;
        """)

        results = db.session.execute(query, params).fetchall()

        report_data = [
            {
                'parroquiaid': row.parroquiaid,
                'parroquia_nombre': row.par_nombre,
                'total_eventos': row.total_eventos,
                'total_reservas': row.total_reservas,
                'ingresos_totales': float(row.ingresos_totales)
            } for row in results
        ]

        return jsonify({'items': report_data}), 200

    except Exception as e:
        print(f"❌ Error en get_parish_activity_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error interno del servidor'}), 500
    
@liturgical_bp.route('/reports/occupancy', methods=['GET'])
@jwt_required()
@permission_required('liturgico_reportes')
def get_occupancy_report():
    """
    Genera un reporte de ocupación de cupos para eventos futuros.
    """
    try:
        query = text("""
            SELECT
                h.horarioid,
                h.h_fecha,
                h.h_hora,
                a.act_titulo,
                p.par_nombre as parroquia_nombre,
                a.act_max_reservas,
                (SELECT COUNT(*) FROM public.reserva r WHERE r.horarioid = h.horarioid) as reservas_count
            FROM public.horario h
            JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            WHERE h.h_fecha >= CURRENT_DATE
            AND a.act_estado = TRUE
            ORDER BY h.h_fecha, h.h_hora;
        """)

        results = db.session.execute(query).fetchall()

        report_data = [
            {
                'horarioid': row.horarioid,
                'fecha': row.h_fecha.isoformat() if row.h_fecha else None,
                'hora': row.h_hora.strftime('%H:%M') if row.h_hora else None,
                'titulo': row.act_titulo,
                'parroquia_nombre': row.parroquia_nombre,
                'max_reservas': row.act_max_reservas,
                'reservas_count': row.reservas_count
            } for row in results
        ]

        return jsonify({'items': report_data}), 200

    except Exception as e:
        print(f"❌ Error en get_occupancy_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error interno del servidor', 'details': str(e)}), 500

@liturgical_bp.route('/reports/financial', methods=['GET'])
@jwt_required()
@permission_required('reportes_gerenciales')
def get_financial_report():
    """
    Genera un reporte financiero detallado de todos los pagos.
    """
    try:
        # Obtener parámetros de filtro
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        pago_medio = request.args.get('pago_medio')
        pago_estado = request.args.get('pago_estado')
        parroquiaid = request.args.get('parroquiaid', type=int)
        acto_nombre = request.args.get('acto_nombre')

        params = {}
        where_clauses = []

        if year:
            where_clauses.append("EXTRACT(YEAR FROM pg.pago_fecha) = :year")
            params['year'] = year
        if month:
            where_clauses.append("EXTRACT(MONTH FROM pg.pago_fecha) = :month")
            params['month'] = month
        if pago_medio:
            where_clauses.append("pg.pago_medio = :pago_medio")
            params['pago_medio'] = pago_medio
        if pago_estado:
            where_clauses.append("pg.pago_estado = :pago_estado")
            params['pago_estado'] = pago_estado
        if parroquiaid:
            where_clauses.append("a.parroquiaid = :parroquiaid")
            params['parroquiaid'] = parroquiaid
        if acto_nombre:
            where_clauses.append("a.act_nombre = :acto_nombre")
            params['acto_nombre'] = acto_nombre

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        query = text(f"""
            SELECT
                pg.pagoid, pg.pago_fecha, pg.pago_medio, pg.pago_monto, pg.pago_estado,
                a.act_nombre, a.act_titulo,
                p.par_nombre,
                COALESCE(per.per_nombres || ' ' || per.per_apellidos, r.res_persona_nombre) as persona_reserva
            FROM public.pago pg
            LEFT JOIN public.reserva r ON pg.pagoid = r.pagoid
            LEFT JOIN public.horario h ON r.horarioid = h.horarioid
            LEFT JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            LEFT JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            LEFT JOIN public.persona per ON r.personaid = per.personaid
            {where_sql}
            ORDER BY pg.pago_fecha DESC;
        """)

        results = db.session.execute(query, params).fetchall()

        report_data = [dict(row._mapping) for row in results]

        # Convertir tipos de datos para JSON
        for item in report_data:
            item['pago_fecha'] = item['pago_fecha'].isoformat() if item.get('pago_fecha') else None
            item['pago_monto'] = float(item['pago_monto']) if item.get('pago_monto') is not None else 0.0

        return jsonify({'items': report_data}), 200

    except Exception as e:
        print(f"❌ Error en get_financial_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reports/celebrated-acts', methods=['GET'])
@jwt_required()
@permission_required('reportes_gerenciales')
def get_celebrated_acts_report():
    """
    Genera un reporte de actos litúrgicos (misas, etc.) celebrados o pendientes.
    """
    try:
        # Obtener parámetros de filtro
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        acto_nombre = request.args.get('acto_nombre')
        parroquiaid = request.args.get('parroquiaid', type=int)
        estado = request.args.get('estado') # 'realizado' o 'pendiente'

        params = {}
        where_clauses = ["a.act_estado = TRUE"]

        if start_date:
            where_clauses.append("h.h_fecha >= :start_date")
            params['start_date'] = start_date
        if end_date:
            where_clauses.append("h.h_fecha <= :end_date")
            params['end_date'] = end_date
        if acto_nombre:
            where_clauses.append("a.act_nombre = :acto_nombre")
            params['acto_nombre'] = acto_nombre
        if parroquiaid:
            where_clauses.append("a.parroquiaid = :parroquiaid")
            params['parroquiaid'] = parroquiaid
        if estado == 'realizado':
            where_clauses.append("h.h_fecha < CURRENT_DATE")
        elif estado == 'pendiente':
            where_clauses.append("h.h_fecha >= CURRENT_DATE")

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        query = text(f"""
            SELECT
                h.horarioid, h.h_fecha, h.h_hora,
                a.act_nombre, a.act_titulo,
                p.par_nombre,
                (SELECT COUNT(*) FROM public.reserva r WHERE r.horarioid = h.horarioid) as asistentes
            FROM public.horario h
            JOIN public.actoliturgico a ON h.actoliturgicoid = a.actoliturgicoid
            JOIN public.parroquia p ON a.parroquiaid = p.parroquiaid
            {where_sql}
            ORDER BY h.h_fecha DESC, h.h_hora DESC;
        """)

        results = db.session.execute(query, params).fetchall()
        report_data = [dict(row._mapping) for row in results]

        for item in report_data:
            item['h_fecha'] = item['h_fecha'].isoformat() if item.get('h_fecha') else None
            item['h_hora'] = item['h_hora'].strftime('%H:%M') if item.get('h_hora') else None

        return jsonify({'items': report_data}), 200

    except Exception as e:
        print(f"❌ Error en get_celebrated_acts_report: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reports/registered-parishioners', methods=['GET'])
@jwt_required()
@permission_required('reportes_transaccionales')
def get_parishioners_report():
    """
    Genera un reporte de feligreses registrados.
    """
    try:
        parroquiaid = request.args.get('parroquiaid', type=int)
        distritoid = request.args.get('distritoid', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        has_reservations = request.args.get('has_reservations')

        params = {}
        where_clauses = []
        having_clauses = []

        if parroquiaid:
            where_clauses.append("per.parroquiaid = :parroquiaid")
            params['parroquiaid'] = parroquiaid
        if distritoid:
            where_clauses.append("par.distritoid = :distritoid")
            params['distritoid'] = distritoid
        if start_date:
            where_clauses.append("per.created_at >= :start_date")
            params['start_date'] = start_date
        if end_date:
            where_clauses.append("per.created_at <= :end_date")
            params['end_date'] = end_date
        
        if has_reservations == 'yes':
            having_clauses.append("COUNT(r.reservaid) > 0")
        elif has_reservations == 'no':
            having_clauses.append("COUNT(r.reservaid) = 0")

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        having_sql = "HAVING " + " AND ".join(having_clauses) if having_clauses else ""

        query = text(f"""
            SELECT
                per.personaid, per.per_nombres, per.per_apellidos, per.fecha_nacimiento,
                per.per_telefono, per.created_at as fecha_registro,
                u.email,
                par.par_nombre,
                d.dis_nombre,
                COUNT(r.reservaid) as numero_reservas
            FROM public.persona per
            LEFT JOIN public.users u ON per.userid = u.id
            LEFT JOIN public.parroquia par ON per.parroquiaid = par.parroquiaid
            LEFT JOIN public.distrito d ON par.distritoid = d.distritoid
            LEFT JOIN public.reserva r ON per.personaid = r.personaid
            {where_sql}
            GROUP BY per.personaid, u.email, par.par_nombre, d.dis_nombre
            {having_sql}
            ORDER BY per.created_at DESC;
        """)

        results = db.session.execute(query, params).fetchall()
        report_data = [dict(row._mapping) for row in results]

        for item in report_data:
            item['fecha_nacimiento'] = item['fecha_nacimiento'].isoformat() if item.get('fecha_nacimiento') else None
            item['fecha_registro'] = item['fecha_registro'].isoformat() if item.get('fecha_registro') else None

        return jsonify({'items': report_data}), 200

    except Exception as e:
        print(f"❌ Error en get_parishioners_report: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500