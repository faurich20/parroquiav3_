from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from app import db
from app.models import ActoLiturgico, LiturgicalAct, LiturgicalSchedule, LiturgicalReservation

liturgical_bp = Blueprint('liturgical', __name__)

# Helpers

def parse_date(date_str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception:
        return None

@liturgical_bp.route('/acts', methods=['GET'])
@jwt_required()
def list_acts():
    try:
        items = [a.to_dict() for a in ActoLiturgico.query.order_by(ActoLiturgico.actoliturgicoid.desc()).all()]
        return jsonify({'items': items}), 200
    except Exception as e:
        print('Error list_acts', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/acts', methods=['POST'])
@jwt_required()
def create_act():
    try:
        data = request.get_json() or {}
        act_fecha = parse_date(data.get('act_fecha'))
        act_hora_str = (data.get('act_hora') or '').strip()
        try:
            act_hora = datetime.strptime(act_hora_str, '%H:%M').time()
        except Exception:
            act_hora = None
        required = [data.get('parroquiaid'), data.get('act_nombre'), data.get('act_titulo'), act_fecha, act_hora]
        if any(v in [None, '', False] for v in required):
            return jsonify({'error': 'parroquiaid, act_nombre, act_titulo, act_fecha y act_hora son requeridos'}), 400
        item = ActoLiturgico(
            parroquiaid=data.get('parroquiaid'),
            act_nombre=(data.get('act_nombre') or '').strip(),
            act_titulo=(data.get('act_titulo') or '').strip(),
            act_fecha=act_fecha,
            act_hora=act_hora,
            act_descripcion=(data.get('act_descripcion') or '').strip() or None,
            act_estado=bool(data.get('act_estado', True)),
        )
        db.session.add(item)
        db.session.commit()
        return jsonify({'item': item.to_dict()}), 201
    except Exception as e:
        print('Error create_act', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/acts/<int:act_id>', methods=['PUT'])
@jwt_required()
def update_act(act_id):
    try:
        item = ActoLiturgico.query.get(act_id)
        if not item:
            return jsonify({'error': 'No encontrado'}), 404
        data = request.get_json() or {}
        if 'parroquiaid' in data: item.parroquiaid = data.get('parroquiaid')
        if 'act_nombre' in data: item.act_nombre = (data.get('act_nombre') or '').strip()
        if 'act_titulo' in data: item.act_titulo = (data.get('act_titulo') or '').strip()
        if 'act_fecha' in data:
            d = parse_date(data.get('act_fecha'))
            if not d:
                return jsonify({'error': 'Fecha inválida'}), 400
            item.act_fecha = d
        if 'act_hora' in data:
            try:
                item.act_hora = datetime.strptime((data.get('act_hora') or '').strip(), '%H:%M').time()
            except Exception:
                return jsonify({'error': 'Hora inválida (HH:MM)'}), 400
        if 'act_descripcion' in data: item.act_descripcion = (data.get('act_descripcion') or '').strip() or None
        if 'act_estado' in data: item.act_estado = bool(data.get('act_estado'))
        db.session.commit()
        return jsonify({'item': item.to_dict()}), 200
    except Exception as e:
        print('Error update_act', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/acts/<int:act_id>', methods=['DELETE'])
@jwt_required()
def delete_act(act_id):
    try:
        item = ActoLiturgico.query.get(act_id)
        if not item:
            return jsonify({'error': 'No encontrado'}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Eliminado'}), 200
    except Exception as e:
        print('Error delete_act', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

# Schedules
@liturgical_bp.route('/schedules', methods=['GET'])
@jwt_required()
def list_schedules():
    try:
        items = [s.to_dict() for s in LiturgicalSchedule.query.order_by(LiturgicalSchedule.id.desc()).all()]
        return jsonify({'items': items}), 200
    except Exception as e:
        print('Error list_schedules', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/schedules', methods=['POST'])
@jwt_required()
def create_schedule():
    try:
        data = request.get_json() or {}
        if data.get('weekday') is None or data.get('time') is None or not data.get('type'):
            return jsonify({'error': 'type, weekday, time son requeridos'}), 400
        item = LiturgicalSchedule(
            type=(data.get('type') or '').strip(),
            weekday=int(data.get('weekday')),
            time=(data.get('time') or '').strip(),
            location=(data.get('location') or '').strip() or None,
            is_active=bool(data.get('is_active', True)),
            parroquiaid=data.get('parroquiaid')
        )
        db.session.add(item)
        db.session.commit()
        return jsonify({'item': item.to_dict()}), 201
    except Exception as e:
        print('Error create_schedule', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/schedules/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_schedule(item_id):
    try:
        item = LiturgicalSchedule.query.get(item_id)
        if not item:
            return jsonify({'error': 'No encontrado'}), 404
        data = request.get_json() or {}
        if 'type' in data: item.type = (data.get('type') or '').strip()
        if 'weekday' in data: item.weekday = int(data.get('weekday'))
        if 'time' in data: item.time = (data.get('time') or '').strip()
        if 'location' in data: item.location = (data.get('location') or '').strip() or None
        if 'is_active' in data: item.is_active = bool(data.get('is_active'))
        db.session.commit()
        return jsonify({'item': item.to_dict()}), 200
    except Exception as e:
        print('Error update_schedule', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/schedules/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(item_id):
    try:
        item = LiturgicalSchedule.query.get(item_id)
        if not item:
            return jsonify({'error': 'No encontrado'}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Eliminado'}), 200
    except Exception as e:
        print('Error delete_schedule', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

# Reservations
@liturgical_bp.route('/reservations', methods=['GET'])
@jwt_required()
def list_reservations():
    try:
        items = [r.to_dict() for r in LiturgicalReservation.query.order_by(LiturgicalReservation.id.desc()).all()]
        return jsonify({'items': items}), 200
    except Exception as e:
        print('Error list_reservations', e)
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reservations', methods=['POST'])
@jwt_required()
def create_reservation():
    try:
        data = request.get_json() or {}
        d = parse_date(data.get('reserved_date'))
        if not d or not data.get('personaid'):
            return jsonify({'error': 'reserved_date y personaid son requeridos'}), 400
        item = LiturgicalReservation(
            act_id=data.get('act_id'),
            personaid=data.get('personaid'),
            reserved_date=d,
            reserved_time=(data.get('reserved_time') or '').strip() or None,
            status=(data.get('status') or 'pendiente').strip(),
            notes=(data.get('notes') or '').strip() or None,
        )
        db.session.add(item)
        db.session.commit()
        return jsonify({'item': item.to_dict()}), 201
    except Exception as e:
        print('Error create_reservation', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reservations/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_reservation(item_id):
    try:
        item = LiturgicalReservation.query.get(item_id)
        if not item:
            return jsonify({'error': 'No encontrado'}), 404
        data = request.get_json() or {}
        if 'act_id' in data: item.act_id = data.get('act_id')
        if 'personaid' in data: item.personaid = data.get('personaid')
        if 'reserved_date' in data:
            d = parse_date(data.get('reserved_date'))
            if not d:
                return jsonify({'error': 'Fecha inválida'}), 400
            item.reserved_date = d
        if 'reserved_time' in data: item.reserved_time = (data.get('reserved_time') or '').strip() or None
        if 'status' in data: item.status = (data.get('status') or '').strip()
        if 'notes' in data: item.notes = (data.get('notes') or '').strip() or None
        db.session.commit()
        return jsonify({'item': item.to_dict()}), 200
    except Exception as e:
        print('Error update_reservation', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@liturgical_bp.route('/reservations/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_reservation(item_id):
    try:
        item = LiturgicalReservation.query.get(item_id)
        if not item:
            return jsonify({'error': 'No encontrado'}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Eliminado'}), 200
    except Exception as e:
        print('Error delete_reservation', e)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
