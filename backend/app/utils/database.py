from app import db
from app.models import User

def init_db():
    """Función para inicializar la base de datos (usada por Flask-Migrate)"""
    # No es necesaria para nuestro script automático
    # pero se mantiene por compatibilidad
    pass