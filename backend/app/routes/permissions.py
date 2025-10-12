from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.constants import PERMISOS, ETIQUETAS_PERMISOS

permissions_bp = Blueprint('permissions', __name__)

@permissions_bp.route('', methods=['GET'])
@jwt_required()
def list_permissions():
    items = [{'id': p, 'name': ETIQUETAS_PERMISOS.get(p, p)} for p in PERMISOS]
    return jsonify({
        'permissions': items,
        'ids': PERMISOS,
        'labels': ETIQUETAS_PERMISOS,
    }), 200
