# import os
# from datetime import timedelta

# class Config:
#     SECRET_KEY = os.environ.get('SECRET_KEY', 'clave-secreta-temporal-parroquia-2024')
#     JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-clave-secreta-temporal-parroquia-2024')
    
#     # CONEXIÓN DIRECTA CON CODIFICACIÓN FORZADA UTF-8
#     SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:982619321@localhost:5432/parroquia_db'
    
#     SQLALCHEMY_TRACK_MODIFICATIONS = False
#     JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
#     JWT_ERROR_MESSAGE_KEY = 'error'
#     CORS_ORIGINS = ['http://localhost:3000']
    
#     # ✅ NUEVA CONFIGURACIÓN PARA FLASK-JWT-EXTENDED
#     JWT_IDENTITY_CLAIM = 'sub'  # Asegurar que use 'sub' como claim de identidad


import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'clave-secreta-temporal-parroquia-2024')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-clave-secreta-temporal-parroquia-2024')
    
    # CONEXIÓN DIRECTA CON CODIFICACIÓN FORZADA UTF-8
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:982619321@localhost:5432/parroquia_db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    #JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=10)  # 🔧 ahora expira en 10 minutos (inactividad backend + seguridad)
    #JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)   # 🔧 refresh token dura 30 días (rotado al usarlo)
    #prueba
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=60)  # access token dura 30s
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(hours=24)  # refresh token dura 1 min
    
    JWT_ERROR_MESSAGE_KEY = 'error'
    CORS_ORIGINS = ['http://localhost:3000']
    
    # ✅ NUEVA CONFIGURACIÓN PARA FLASK-JWT-EXTENDED
    JWT_IDENTITY_CLAIM = 'sub'  # Asegurar que use 'sub' como claim de identidad
