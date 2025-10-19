from sqlalchemy import Column, Integer, String, Boolean, Date, Time, Text, DateTime, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class ActoLiturgico(Base):
    __tablename__ = 'actoliturgico'

    actoliturgicoid = Column(Integer, primary_key=True, autoincrement=True)
    parroquiaid = Column(Integer, ForeignKey('parroquia.parroquiaid'), nullable=True)
    act_nombre = Column(String(100), nullable=False)  # misa, bautismo, matrimonio, etc.
    act_titulo = Column(String(200), nullable=False)  # ej. Misa Dominical
    act_descripcion = Column(Text, nullable=True)
    act_estado = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relaciones
    parroquia = relationship("Parroquia", back_populates="actos_liturgicos")
    horarios = relationship("Horario", back_populates="acto_liturgico", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'actoliturgicoid': self.actoliturgicoid,
            'parroquiaid': self.parroquiaid,
            'parroquia_nombre': self.parroquia.par_nombre if self.parroquia else None,
            'act_nombre': self.act_nombre,
            'act_titulo': self.act_titulo,
            'act_descripcion': self.act_descripcion,
            'act_estado': self.act_estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Horario(Base):
    __tablename__ = 'horario'

    horarioid = Column(Integer, primary_key=True, autoincrement=True)
    actoliturgicoid = Column(Integer, ForeignKey('actoliturgico.actoliturgicoid'), nullable=False)
    h_fecha = Column(Date, nullable=False)  # fecha específica del horario
    h_hora = Column(Time, nullable=False)   # hora específica del horario
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relaciones
    acto_liturgico = relationship("ActoLiturgico", back_populates="horarios")
    reservas = relationship("Reserva", back_populates="horario", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'horarioid': self.horarioid,
            'actoliturgicoid': self.actoliturgicoid,
            'acto_nombre': self.acto_liturgico.act_nombre if self.acto_liturgico else None,
            'acto_titulo': self.acto_liturgico.act_titulo if self.acto_liturgico else None,
            'h_fecha': self.h_fecha.isoformat() if self.h_fecha else None,
            'h_hora': self.h_hora.strftime('%H:%M') if self.h_hora else None,
            'parroquiaid': self.acto_liturgico.parroquiaid if self.acto_liturgico else None,
            'parroquia_nombre': self.acto_liturgico.parroquia.par_nombre if self.acto_liturgico and self.acto_liturgico.parroquia else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Reserva(Base):
    __tablename__ = 'reserva'

    reservaid = Column(Integer, primary_key=True, autoincrement=True)
    horarioid = Column(Integer, ForeignKey('horario.horarioid'), nullable=False)
    personaid = Column(Integer, ForeignKey('persona.personaid'), nullable=True)
    res_descripcion = Column(Text, nullable=False)
    res_estado = Column(Boolean, nullable=False, default=False)  # true: Cancelado, false: Sin pagar
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relaciones
    horario = relationship("Horario", back_populates="reservas")
    persona = relationship("Persona", back_populates="reservas")

    def to_dict(self):
        return {
            'reservaid': self.reservaid,
            'horarioid': self.horarioid,
            'personaid': self.personaid,
            'persona_nombre': f"{self.persona.per_nombres} {self.persona.per_apellidos}" if self.persona else None,
            'res_descripcion': self.res_descripcion,
            'res_estado': self.res_estado,  # true = Cancelado, false = Sin pagar
            'estado_texto': 'Cancelado' if self.res_estado else 'Sin pagar',
            'h_fecha': self.horario.h_fecha.isoformat() if self.horario and self.horario.h_fecha else None,
            'h_hora': self.horario.h_hora.strftime('%H:%M') if self.horario and self.horario.h_hora else None,
            'acto_nombre': self.horario.acto_liturgico.act_nombre if self.horario and self.horario.acto_liturgico else None,
            'acto_titulo': self.horario.acto_liturgico.act_titulo if self.horario and self.horario.acto_liturgico else None,
            'parroquia_nombre': self.horario.acto_liturgico.parroquia.par_nombre if self.horario and self.horario.acto_liturgico and self.horario.acto_liturgico.parroquia else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
