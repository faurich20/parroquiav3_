from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models import Provincia, Distrito, Departamento

def to_list(query):
    return [row.to_dict() for row in query]

geo_bp = Blueprint('geo', __name__)

@geo_bp.get('/provincias')
@jwt_required()
def get_provincias():
    return jsonify({'provincias': to_list(Provincia.query.all())})

@geo_bp.get('/distritos')
@jwt_required()
def get_distritos():
    return jsonify({'distritos': to_list(Distrito.query.all())})

@geo_bp.get('/departamentos')
@jwt_required()
def get_departamentos():
    return jsonify({'departamentos': to_list(Departamento.query.all())})
