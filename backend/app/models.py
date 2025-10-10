# from app import db
# from app.utils.security import hash_password, check_password
# from sqlalchemy.dialects.postgresql import JSON
# from datetime import datetime

# class User(db.Model):
#     __tablename__ = 'users'
    
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(100), nullable=False)
#     email = db.Column(db.String(120), unique=True, nullable=False)
#     password_hash = db.Column(db.String(255), nullable=False)
#     role = db.Column(db.String(50), nullable=False, default='user')
#     permissions = db.Column(JSON, default=[])
#     is_active = db.Column(db.Boolean, default=True)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
#     last_login = db.Column(db.DateTime)
    
#     def set_password(self, password):
#         self.password_hash = hash_password(password)
    
#     def check_password(self, password):
#         return check_password(self.password_hash, password)
    
#     def to_dict(self):
#         return {
#             'id': self.id,
#             'name': self.name,
#             'email': self.email,
#             'role': self.role,
#             'permissions': self.permissions,
#             'status': 'Activo' if self.is_active else 'Inactivo',
#             'last_login': self.last_login.isoformat() if self.last_login else None,
#             'created_at': self.created_at.isoformat() if self.created_at else None,
#             'updated_at': self.updated_at.isoformat() if self.updated_at else None
#         }

# class RefreshToken(db.Model):
#     __tablename__ = 'refresh_tokens'
    
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
#     token = db.Column(db.Text, unique=True, nullable=False)  # ✅ Cambiado a Text
#     expires_at = db.Column(db.DateTime, nullable=False)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     revoked = db.Column(db.Boolean, default=False)
    
#     user = db.relationship('User', backref=db.backref('tokens', lazy=True))


from app import db
from app.utils.security import hash_password, check_password
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user')
    permissions = db.Column(JSON, default=[])
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    last_activity = db.Column(db.DateTime)  # 🔧 nuevo: última actividad para inactividad en backend
    
    def set_password(self, password):
        self.password_hash = hash_password(password)
    
    def check_password(self, password):
        return check_password(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'permissions': self.permissions,
            'status': 'Activo' if self.is_active else 'Inactivo',
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class RefreshToken(db.Model):
    __tablename__ = 'refresh_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.Text, unique=True, nullable=False)  # ✅ Cambiado a Text
    jti = db.Column(db.String(128), unique=True, nullable=True)  # 🔧 nuevo: jti del JWT (para blocklist)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    revoked = db.Column(db.Boolean, default=False)
    
    user = db.relationship('User', backref=db.backref('tokens', lazy=True))
