from app import db
from app.utils.security import hash_password, check_password
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime, timedelta

class Role(db.Model):
    __tablename__ = 'roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255))
    permissions = db.Column(JSON, default=[])
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'permissions': self.permissions or [],
            'status': 'Activo' if self.is_active else 'Inactivo',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user')
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
        # Resolver role y permisos efectivos desde Role.permissions
        role_id = None
        permissions = []
        try:
            role_row = Role.query.filter_by(name=self.role).first() if self.role else None
            role_id = role_row.id if role_row else None
            permissions = (role_row.permissions or []) if role_row else []
        except Exception:
            permissions = []

        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'role_name': self.role,
            'role_id': role_id,
            'permissions': permissions,
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


class UserPreferences(db.Model):
    __tablename__ = 'user_preferences'

    # Preferimos la columna user_id como PK; si la tabla actual tiene 'userid', crea una VIEW o ajusta migración.
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    data = db.Column(JSON, nullable=False, default=dict)

    user = db.relationship('User', backref=db.backref('preferences_rel', uselist=False))

    def to_dict(self):
        return self.data or {}


# ==========================
#  Geo y Entidades parroquiales
# ==========================
class Provincia(db.Model):
    __tablename__ = 'provincia'
    provinciaid = db.Column(db.Integer, primary_key=True)
    prov_nombre = db.Column(db.String, nullable=False)
    departamentoid = db.Column(db.Integer, db.ForeignKey('departamento.departamentoid'), nullable=False)

    departamento = db.relationship('Departamento', backref=db.backref('provincias', lazy=True))

    def to_dict(self):
        return { 'provinciaid': self.provinciaid, 'prov_nombre': self.prov_nombre, 'departamentoid': self.departamentoid }


class Distrito(db.Model):
    __tablename__ = 'distrito'
    distritoid = db.Column(db.Integer, primary_key=True)
    dis_nombre = db.Column(db.String, nullable=False)
    provinciaid = db.Column(db.Integer, db.ForeignKey('provincia.provinciaid'), nullable=False)

    provincia = db.relationship('Provincia', backref=db.backref('distritos', lazy=True))

    def to_dict(self):
        return { 'distritoid': self.distritoid, 'dis_nombre': self.dis_nombre, 'provinciaid': self.provinciaid }


class Departamento(db.Model):
    __tablename__ = 'departamento'
    departamentoid = db.Column(db.Integer, primary_key=True)
    dep_nombre = db.Column(db.String, nullable=False)

    def to_dict(self):
        return {
            'departamentoid': self.departamentoid,
            'dep_nombre': self.dep_nombre,
        }


class Parroquia(db.Model):
    __tablename__ = 'parroquia'
    parroquiaid = db.Column(db.Integer, primary_key=True)
    par_nombre = db.Column(db.String, nullable=False)
    par_direccion = db.Column(db.String, nullable=False)
    distritoid = db.Column(db.Integer, db.ForeignKey('distrito.distritoid'), nullable=False)
    par_telefono1 = db.Column(db.String, nullable=False)
    par_telefono2 = db.Column(db.String)

    distrito = db.relationship('Distrito')

    def to_dict(self):
        dis = self.distrito
        prov = dis.provincia if dis else None
        dep = prov.departamento if prov else None
        return {
            'parroquiaid': self.parroquiaid,
            'par_nombre': self.par_nombre,
            'par_direccion': self.par_direccion,
            'distritoid': self.distritoid,
            'provinciaid': prov.provinciaid if prov else None,
            'departamentoid': dep.departamentoid if dep else None,
            'dep_nombre': dep.dep_nombre if dep else None,
            'prov_nombre': prov.prov_nombre if prov else None,
            'dis_nombre': dis.dis_nombre if dis else None,
            'par_telefono1': self.par_telefono1,
            'par_telefono2': self.par_telefono2
        }


class Persona(db.Model):
    __tablename__ = 'persona'
    personaid = db.Column(db.Integer, primary_key=True)
    userid = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True)
    per_nombres = db.Column(db.String, nullable=False)
    per_apellidos = db.Column(db.String, nullable=False)
    per_domicilio = db.Column(db.String)
    per_telefono = db.Column(db.String)
    fecha_nacimiento = db.Column(db.Date, nullable=False)
    parroquiaid = db.Column(db.Integer, db.ForeignKey('parroquia.parroquiaid'), nullable=False)

    user = db.relationship('User', backref=db.backref('persona_rel', uselist=False))
    parroquia = db.relationship('Parroquia')

    def to_dict(self):
        return {
            'personaid': self.personaid,
            'userid': self.userid,
            'per_nombres': self.per_nombres,
            'per_apellidos': self.per_apellidos,
            'per_domicilio': self.per_domicilio,
            'per_telefono': self.per_telefono,
            'fecha_nacimiento': self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None,
            'parroquiaid': self.parroquiaid
        }


# ==========================
#  Liturgia
# ==========================
class ActoLiturgico(db.Model):
    __tablename__ = 'actoliturgico'

    actoliturgicoid = db.Column(db.Integer, primary_key=True)
    parroquiaid = db.Column(db.Integer, db.ForeignKey('parroquia.parroquiaid'))
    act_nombre = db.Column(db.String(100), nullable=False)
    act_titulo = db.Column(db.String(200), nullable=False)
    act_fecha = db.Column(db.Date, nullable=False)
    act_hora = db.Column(db.Time, nullable=False)
    act_descripcion = db.Column(db.Text)
    act_estado = db.Column(db.Boolean, default=True)

    parroquia = db.relationship('Parroquia')

    def to_dict(self):
        # Estado dinámico: inactivo si han pasado 2h desde act_hora en act_fecha
        estado = bool(self.act_estado)
        try:
            if self.act_fecha and self.act_hora:
                dt = datetime.combine(self.act_fecha, self.act_hora)
                if datetime.utcnow() > dt + timedelta(hours=2):
                    estado = False
        except Exception:
            pass

        return {
            'id': self.actoliturgicoid,  # compat con useCrud/TablaBase si se usa
            'actoliturgicoid': self.actoliturgicoid,
            'parroquiaid': self.parroquiaid,
            'parroquia_nombre': self.parroquia.par_nombre if self.parroquia else None,
            'act_nombre': self.act_nombre,
            'act_titulo': self.act_titulo,
            'act_fecha': self.act_fecha.isoformat() if self.act_fecha else None,
            'act_hora': self.act_hora.strftime('%H:%M') if self.act_hora else None,
            'act_descripcion': self.act_descripcion,
            'act_estado': estado,
        }
class LiturgicalAct(db.Model):
    __tablename__ = 'liturgical_act'

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.String(10), nullable=False)  # formato HH:MM
    location = db.Column(db.String(200))
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    parroquiaid = db.Column(db.Integer, db.ForeignKey('parroquia.parroquiaid'))

    parroquia = db.relationship('Parroquia')

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'date': self.date.isoformat() if self.date else None,
            'time': self.time,
            'location': self.location,
            'notes': self.notes,
            'is_active': self.is_active,
            'parroquiaid': self.parroquiaid,
        }


class LiturgicalSchedule(db.Model):
    __tablename__ = 'liturgical_schedule'

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    weekday = db.Column(db.SmallInteger, nullable=False)  # 0-6
    time = db.Column(db.String(10), nullable=False)  # HH:MM
    location = db.Column(db.String(200))
    is_active = db.Column(db.Boolean, default=True)
    parroquiaid = db.Column(db.Integer, db.ForeignKey('parroquia.parroquiaid'))

    parroquia = db.relationship('Parroquia')

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'weekday': self.weekday,
            'time': self.time,
            'location': self.location,
            'is_active': self.is_active,
            'parroquiaid': self.parroquiaid,
        }


class LiturgicalReservation(db.Model):
    __tablename__ = 'liturgical_reservation'

    id = db.Column(db.Integer, primary_key=True)
    act_id = db.Column(db.Integer, db.ForeignKey('liturgical_act.id'))
    personaid = db.Column(db.Integer, db.ForeignKey('persona.personaid'))
    reserved_date = db.Column(db.Date, nullable=False)
    reserved_time = db.Column(db.String(10))  # HH:MM
    status = db.Column(db.String(20), default='pendiente')
    notes = db.Column(db.Text)

    act = db.relationship('LiturgicalAct')
    persona = db.relationship('Persona')

    def to_dict(self):
        return {
            'id': self.id,
            'act_id': self.act_id,
            'personaid': self.personaid,
            'reserved_date': self.reserved_date.isoformat() if self.reserved_date else None,
            'reserved_time': self.reserved_time,
            'status': self.status,
            'notes': self.notes,
        }
