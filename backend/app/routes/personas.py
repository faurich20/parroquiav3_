from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Persona

personas_bp = Blueprint('personas', __name__)

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
