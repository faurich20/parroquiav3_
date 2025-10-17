from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.models import Provincia, Distrito, Departamento

def to_list(query):
    return [row.to_dict() for row in query]

geo_bp = Blueprint('geo', __name__)

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
