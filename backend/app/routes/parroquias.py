from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, verify_jwt_in_request
from app import db
from app.models import Parroquia
from app.utils.permissions import has_permission, permission_required

parroquias_bp = Blueprint('parroquias', __name__)

@parroquias_bp.before_request
def _enforce_parroquias_permissions():
    # Permitir preflight CORS sin autenticación
    if request.method == 'OPTIONS':
        return None

    # Parroquias se usan tanto en Seguridad como en Litúrgico y Personal.
    verify_jwt_in_request()
    if not (
        has_permission('seguridad')
        or has_permission('seguridad_parroquias')
        or has_permission('liturgico')
        or has_permission('personal')
    ):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Permiso requerido: seguridad, liturgico o personal'
        }), 403

@parroquias_bp.get('')
@jwt_required()
@permission_required(
    'seguridad_parroquias_ver',
    'seguridad_parroquias',
    'seguridad',
    'liturgico',
    'personal',
)
def list_parroquias():
    rows = Parroquia.query.all()
    return jsonify({'parroquias': [r.to_dict() for r in rows]})

@parroquias_bp.post('')
@jwt_required()
@permission_required('seguridad_parroquias_crear', 'seguridad_parroquias', 'seguridad')
def create_parroquia():
    data = request.get_json() or {}
    # Coordenadas opcionales
    lat = data.get('par_latitud')
    lng = data.get('par_longitud')
    try:
        lat = float(lat) if lat is not None and lat != '' else None
    except (TypeError, ValueError):
        lat = None
    try:
        lng = float(lng) if lng is not None and lng != '' else None
    except (TypeError, ValueError):
        lng = None

    p = Parroquia(
        par_nombre=data.get('par_nombre','').strip(),
        par_direccion=data.get('par_direccion','').strip(),
        distritoid=data.get('distritoid'),
        par_telefono1=data.get('par_telefono1','').strip(),
        par_telefono2=data.get('par_telefono2'),
        par_latitud=lat,
        par_longitud=lng,
    )
    db.session.add(p)
    db.session.commit()
    # useCrud espera la clave "item" para agregar el registro creado
    return jsonify({'item': p.to_dict()}), 201

@parroquias_bp.put('/<int:parroquiaid>')
@jwt_required()
@permission_required('seguridad_parroquias_editar', 'seguridad_parroquias', 'seguridad')
def update_parroquia(parroquiaid):
    p = Parroquia.query.get(parroquiaid)
    if not p:
        return jsonify({'error':'No encontrado'}), 404
    data = request.get_json() or {}
    for k in ['par_nombre','par_direccion','par_telefono1','par_telefono2']:
        if k in data:
            setattr(p, k, data[k])
    if 'distritoid' in data:
        p.distritoid = data['distritoid']
    # Actualizar coordenadas si vienen
    if 'par_latitud' in data:
        try:
            p.par_latitud = float(data['par_latitud']) if data['par_latitud'] not in (None, '') else None
        except (TypeError, ValueError):
            p.par_latitud = None
    if 'par_longitud' in data:
        try:
            p.par_longitud = float(data['par_longitud']) if data['par_longitud'] not in (None, '') else None
        except (TypeError, ValueError):
            p.par_longitud = None
    db.session.commit()
    # useCrud espera la clave "item" para actualizar el registro en memoria
    return jsonify({'item': p.to_dict()})

@parroquias_bp.delete('/<int:parroquiaid>')
@jwt_required()
@permission_required('seguridad_parroquias_eliminar', 'seguridad_parroquias', 'seguridad')
def delete_parroquia(parroquiaid):
    p = Parroquia.query.get(parroquiaid)
    if not p:
        return jsonify({'error':'No encontrado'}), 404
    db.session.delete(p)
    db.session.commit()
    return jsonify({'success': True})
