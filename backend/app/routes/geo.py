from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, verify_jwt_in_request
from app.models import Provincia, Distrito, Departamento
from app.utils.permissions import has_permission


def to_list(query):
    return [row.to_dict() for row in query]


geo_bp = Blueprint('geo', __name__)


@geo_bp.before_request
def _enforce_geo_permissions():
    # Permitir preflight CORS sin autenticación
    if request.method == 'OPTIONS':
        return None

    # Catálogos usados por varias áreas; permitir si el usuario tiene
    # al menos uno de estos permisos funcionales comunes.
    verify_jwt_in_request()
    if not (
        has_permission('personal')
        or has_permission('seguridad')
        or has_permission('configuracion')
        or has_permission('liturgico')
    ):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Permiso requerido: personal, seguridad, configuracion o liturgico'
        }), 403


@geo_bp.get('/provincias')
@jwt_required()
def get_provincias():
    departamentoid = request.args.get('departamentoid', type=int)
    q = Provincia.query
    if departamentoid:
        q = q.filter(Provincia.departamentoid == departamentoid)
    return jsonify({'provincias': to_list(q.all())})


@geo_bp.get('/distritos')
@jwt_required()
def get_distritos():
    provinciaid = request.args.get('provinciaid', type=int)
    q = Distrito.query
    if provinciaid:
        q = q.filter(Distrito.provinciaid == provinciaid)
    return jsonify({'distritos': to_list(q.all())})


@geo_bp.get('/departamentos')
@jwt_required()
def get_departamentos():
    return jsonify({'departamentos': to_list(Departamento.query.all())})
