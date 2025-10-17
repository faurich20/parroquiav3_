from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Parroquia

parroquias_bp = Blueprint('parroquias', __name__)

@parroquias_bp.get('')
@jwt_required()
def list_parroquias():
    rows = Parroquia.query.all()
    return jsonify({'parroquias': [r.to_dict() for r in rows]})

@parroquias_bp.post('')
@jwt_required()
def create_parroquia():
    data = request.get_json() or {}
    p = Parroquia(
        par_nombre=data.get('par_nombre','').strip(),
        par_direccion=data.get('par_direccion','').strip(),
        distritoid=data.get('distritoid'),
        par_telefono1=data.get('par_telefono1','').strip(),
        par_telefono2=data.get('par_telefono2')
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({'parroquia': p.to_dict()}), 201

@parroquias_bp.put('/<int:parroquiaid>')
@jwt_required()
def update_parroquia(parroquiaid):
    p = Parroquia.query.get(parroquiaid)
    if not p:
        return jsonify({'error':'No encontrado'}), 404
    data = request.get_json() or {}
    for k in ['par_nombre','par_direccion','par_telefono1','par_telefono2']:
        if k in data: setattr(p, k, data[k])
    if 'distritoid' in data: p.distritoid = data['distritoid']
    db.session.commit()
    return jsonify({'parroquia': p.to_dict()})

@parroquias_bp.delete('/<int:parroquiaid>')
@jwt_required()
def delete_parroquia(parroquiaid):
    p = Parroquia.query.get(parroquiaid)
    if not p:
        return jsonify({'error':'No encontrado'}), 404
    db.session.delete(p)
    db.session.commit()
    return jsonify({'success': True})
