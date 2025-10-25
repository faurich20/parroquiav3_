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
    pagoid = Column(Integer, ForeignKey('pago.pagoid'), nullable=True)  # FK nullable a tabla pago
    res_descripcion = Column(Text, nullable=False)
    # res_estado se obtiene dinámicamente desde tabla pago (pagoid FK)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relaciones
    horario = relationship("Horario", back_populates="reservas")
    persona = relationship("Persona", back_populates="reservas")
    pago = relationship("Pago", back_populates="reservas")  # Nueva relación con pago

    def to_dict(self):
        # Obtener estado del pago relacionado
        pago_estado = None
        if self.pago:
            pago_estado = self.pago.pago_estado
        else:
            pago_estado = 'pendiente'  # Por defecto si no hay pago
        
        return {
            'reservaid': self.reservaid,
            'horarioid': self.horarioid,
            'personaid': self.personaid,
            'persona_nombre': f"{self.persona.per_nombres} {self.persona.per_apellidos}" if self.persona else None,
            'res_descripcion': self.res_descripcion,
            'pagoid': self.pagoid if hasattr(self, 'pagoid') else None,  # FK a tabla pago
            'pago_estado': pago_estado,  # Estado del pago: 'pendiente', 'pagado', 'vencido', 'fallido'
            'estado_texto': pago_estado.capitalize(),  # Capitalizar para mostrar
            'h_fecha': self.horario.h_fecha.isoformat() if self.horario and self.horario.h_fecha else None,
            'h_hora': self.horario.h_hora.strftime('%H:%M') if self.horario and self.horario.h_hora else None,
            'acto_nombre': self.horario.acto_liturgico.act_nombre if self.horario and self.horario.acto_liturgico else None,
            'acto_titulo': self.horario.acto_liturgico.act_titulo if self.horario and self.horario.acto_liturgico else None,
            'parroquia_nombre': self.horario.acto_liturgico.parroquia.par_nombre if self.horario and self.horario.acto_liturgico and self.horario.acto_liturgico.parroquia else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Pago(Base):
    __tablename__ = 'pago'

    pagoid = Column(Integer, primary_key=True, autoincrement=True)
    pago_medio = Column(String(15), nullable=False)  # 'Yape o Plin', 'Tarjeta', 'Efectivo'
    pago_monto = Column(Float, nullable=False)
    pago_estado = Column(String(15), nullable=False, default='pendiente')  # 'pendiente', 'pagado', 'vencido', 'fallido'
    pago_descripcion = Column(Text, nullable=True)
    pago_fecha = Column(DateTime, nullable=False, default=func.now())
    pago_confirmado = Column(DateTime, nullable=True)
    pago_expira = Column(DateTime, nullable=False, default=func.now() + func.text("INTERVAL '1 hour'"))
    # Información adicional para pagos con tarjeta
    pago_tarjeta_ultimos = Column(String(4), nullable=True)  # últimos 4 dígitos
    pago_tarjeta_tipo = Column(String(20), nullable=True)  # Visa, Mastercard, etc.
    # Información adicional para Yape/Plin
    pago_qr_data = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # Relaciones
    reservas = relationship("Reserva", back_populates="pago")

    def to_dict(self):
        return {
            'pagoid': self.pagoid,
            'pago_medio': self.pago_medio,
            'pago_monto': self.pago_monto,
            'pago_estado': self.pago_estado,
            'pago_descripcion': self.pago_descripcion,
            'pago_fecha': self.pago_fecha.isoformat() if self.pago_fecha else None,
            'pago_confirmado': self.pago_confirmado.isoformat() if self.pago_confirmado else None,
            'pago_expira': self.pago_expira.isoformat() if self.pago_expira else None,
            'pago_tarjeta_ultimos': self.pago_tarjeta_ultimos,
            'pago_tarjeta_tipo': self.pago_tarjeta_tipo,
            'pago_qr_data': self.pago_qr_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
