from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, verify_jwt_in_request
from app import db
from app.models import Persona
from app.utils.permissions import has_permission

personas_bp = Blueprint('personas', __name__)

@personas_bp.before_request
def _enforce_personas_permissions():
    # Permitir preflight CORS sin autenticación
    if request.method == 'OPTIONS':
        return None

    # Personas es compartido (Personal, Litúrgico, posiblemente Seguridad)
    verify_jwt_in_request()
    if not (
        has_permission('personal')
        or has_permission('liturgico')
        or has_permission('seguridad')
    ):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Permiso requerido: personal, liturgico o seguridad'
        }), 403

@personas_bp.get('')
@jwt_required()
def list_personas():
    rows = Persona.query.all()
    return jsonify({'personas': [r.to_dict() for r in rows]})

@personas_bp.post('')
@jwt_required()
def create_persona():
    data = request.get_json() or {}
    p = Persona(
        userid=data.get('userid'),
        per_nombres=data.get('per_nombres','').strip(),
        per_apellidos=data.get('per_apellidos','').strip(),
        per_domicilio=data.get('per_domicilio'),
        per_telefono=data.get('per_telefono'),
        fecha_nacimiento=data.get('fecha_nacimiento'),
        parroquiaid=data.get('parroquiaid')
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({'persona': p.to_dict()}), 201

@personas_bp.put('/<int:personaid>')
@jwt_required()
def update_persona(personaid):
    p = Persona.query.get(personaid)
    if not p:
        return jsonify({'error':'No encontrado'}), 404
    data = request.get_json() or {}
    for k in ['per_nombres','per_apellidos','per_domicilio','per_telefono']:
        if k in data: setattr(p, k, data[k])
    if 'fecha_nacimiento' in data: p.fecha_nacimiento = data['fecha_nacimiento']
    if 'parroquiaid' in data: p.parroquiaid = data['parroquiaid']
    db.session.commit()
    return jsonify({'persona': p.to_dict()})

@personas_bp.delete('/<int:personaid>')
@jwt_required()
def delete_persona(personaid):
    p = Persona.query.get(personaid)
    if not p:
        return jsonify({'error':'No encontrado'}), 404
    db.session.delete(p)
    db.session.commit()
    return jsonify({'success': True})
