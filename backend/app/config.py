import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'clave-secreta-temporal-parroquia-2024')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-clave-secreta-temporal-parroquia-2024')
    
    # CONEXIÓN DIRECTA CON CODIFICACIÓN FORZADA UTF-8
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:982619321@localhost:5432/parroquia_db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # ⚙️ TIEMPOS SINCRONIZADOS CON FRONTEND
    # Access token: 15 minutos (frontend hace refresh proactivo a los 13 min)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=1)
    
    # Refresh token: 7 días (con rotación en cada uso)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    
    JWT_ERROR_MESSAGE_KEY = 'error'
    CORS_ORIGINS = ['http://localhost:3000']
    
    # ✅ NUEVA CONFIGURACIÓN PARA FLASK-JWT-EXTENDED
    JWT_IDENTITY_CLAIM = 'sub'  # Asegurar que use 'sub' como claim de identidad
