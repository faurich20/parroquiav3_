import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Plus, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import useLiturgicalCalendar from '../../hooks/useLiturgicalCalendar';
import { LITURGICAL_TYPES } from '../../constants/liturgical';
import { useAuth } from '../../contexts/AuthContext';

// Configuración de localización para español
const locales = {
  'es': es
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Lunes como primer día
  getDay,
  locales,
});

const Horarios = () => {
  const { items, loading, error, refetch } = useLiturgicalCalendar();
  const { user, authFetch } = useAuth();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [noSchedulesOpen, setNoSchedulesOpen] = useState(false);

  // Recargar calendario cuando el usuario vuelve a estar autenticado
  useEffect(() => {
    if (user && refetch) {
      refetch();
    }
  }, [user, refetch]);

  // Mapear los datos de la API al formato que espera react-big-calendar
  const events = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }

    return items.map(event => {
      try {
        // La API devuelve: date (YYYY-MM-DD), time (HH:MM), type, title, location
        const eventDate = event.date;
        const eventTime = event.time;

        if (!eventDate || !eventTime) {
          console.warn('Horario sin fecha u hora:', event);
          return null;
        }

        // Crear objeto Date combinando fecha y hora
        const startDateTime = new Date(`${eventDate}T${eventTime}:00`);
        
        // Validar que la fecha sea válida
        if (isNaN(startDateTime.getTime())) {
          console.warn('Fecha inválida:', eventDate, eventTime);
          return null;
        }

        // Duración por defecto de 1 hora
        const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));

        return {
          id: event.horarioid,
          title: event.title || 'Sin título',
          start: startDateTime,
          end: endDateTime,
          location: event.location || 'Sin ubicación',
          type: event.type || 'misa',
          allDay: false,
          reservas_count: event.reservas_count || 0,
          reservas_activas_count: event.reservas_activas_count || 0,
          actoliturgicoid: event.actoliturgicoid
        };
      } catch (error) {
        console.error('Error procesando horario:', event, error);
        return null;
      }
    }).filter(Boolean); // Filtrar eventos nulos
  }, [items]);

  // Estilos personalizados para los eventos según su tipo
  const eventStyleGetter = (event) => {
    const liturgicalType = LITURGICAL_TYPES[event.type];
    const backgroundColor = liturgicalType ? liturgicalType.color : '#3b82f6';

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        padding: '4px 8px',
        fontSize: '0.875rem',
        fontWeight: '500',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
      }
    };
  };

  // Componente personalizado para mostrar el evento en el calendario
  const EventComponent = useCallback(({ event }) => (
    <div className="overflow-hidden">
      <div className="font-medium text-sm truncate">{event.title}</div>
      <div className="text-xs opacity-90 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {format(event.start, 'HH:mm')}
      </div>
      {event.reservas_count > 0 && (
        <div className="text-xs opacity-90">
          📋 {event.reservas_activas_count}/{event.reservas_count} reservas
        </div>
      )}
    </div>
  ), []);

  // Confirmar creación de reserva
  const confirmReservation = useCallback(() => {
    if (pendingReservation) {
      const { dateStr, timeStr, horarioid } = pendingReservation;
      if (horarioid) {
        navigate(`/liturgico/reservas?from=calendar&horarioid=${horarioid}&date=${dateStr}&time=${timeStr}`);
      } else {
        navigate(`/liturgico/reservas?from=calendar&date=${dateStr}&time=${timeStr}`);
      }
    }
    setConfirmOpen(false);
    setPendingReservation(null);
  }, [pendingReservation, navigate]);

  // Manejador para crear nueva reserva al seleccionar un slot vacío
  const handleSelectSlot = useCallback(({ start, end }) => {
    // Validar que start y end existan y sean objetos Date válidos
    if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return;
    }

    // Evitar múltiples diálogos si ya hay uno abierto
    if (confirmOpen || noSchedulesOpen) {
      return;
    }

    try {
      // Validar que la fecha no sea anterior a hoy (sin mostrar alert)
      const today = startOfDay(new Date());
      const selectedDate = startOfDay(start);

      if (isBefore(selectedDate, today)) {
        return; // Simplemente no hacer nada
      }

      const dateStr = format(start, 'yyyy-MM-dd');
      const timeStr = format(start, 'HH:mm');

      // Validar si existen horarios programados para ese día
      const hasEventsForDay = events.some(evt => startOfDay(evt.start).getTime() === selectedDate.getTime());

      if (!hasEventsForDay) {
        // Mostrar aviso de que no hay horarios programados
        setNoSchedulesOpen(true);
        return;
      }

      // Guardar datos y mostrar confirmación
      setPendingReservation({ dateStr, timeStr, horarioid: null });
      setConfirmOpen(true);
    } catch (error) {
      console.error('Error en handleSelectSlot:', error);
      // No hacer nada si hay error
    }
  }, [confirmOpen, noSchedulesOpen, events]);

  // Manejador para redirigir a reservas al hacer click en un evento
  const handleSelectEvent = useCallback((event) => {
    // Validar que el evento exista y tenga id
    if (!event || !event.id) {
      return;
    }

    // Evitar múltiples diálogos si ya hay uno abierto
    if (confirmOpen) {
      return;
    }

    try {
      // Buscar el evento completo en items usando el horarioid
      const fullEvent = items.find(item => item.horarioid === event.id);

      if (fullEvent && fullEvent.date) {
        // Validar que la fecha no sea anterior a hoy (sin mostrar alert)
        const today = startOfDay(new Date());
        const eventDate = startOfDay(new Date(fullEvent.date));

        if (isBefore(eventDate, today)) {
          return; // Simplemente no hacer nada
        }

        // Guardar datos y mostrar confirmación
        setPendingReservation({
          dateStr: fullEvent.date,
          timeStr: fullEvent.time,
          horarioid: fullEvent.horarioid
        });
        setConfirmOpen(true);
      }
    } catch (err) {
      console.error('Error al abrir detalle del evento:', err);
      // No hacer nada si hay error
    }
  }, [confirmOpen, items]);

  // Estado de carga
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Calendario Litúrgico"
          subtitle="Visualiza y gestiona los horarios de actos litúrgicos"
          icon={Clock}
        />
        <Card className="p-8">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div 
                className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4"
                style={{ borderBottomColor: 'var(--primary)' }}
              ></div>
              <p className="text-gray-600 text-lg font-medium">Cargando calendario...</p>
              <p className="text-gray-500 text-sm mt-2">Obteniendo horarios programados</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Calendario Litúrgico"
          subtitle="Visualiza y gestiona los horarios de actos litúrgicos"
          icon={Clock}
        />
        <Card className="p-8">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center max-w-md">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Error al cargar el calendario</h3>
              <p className="text-red-600 mb-6">{error}</p>
              <motion.button
                onClick={refetch}
                className="text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-all hover:brightness-110 shadow-md"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' 
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-5 h-5" />
                Reintentar
              </motion.button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Vista principal del calendario
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario Litúrgico"
        subtitle={`Visualiza y gestiona los horarios de actos litúrgicos (${events.length} horario${events.length !== 1 ? 's' : ''})`}
        icon={Clock}
      >
        <motion.button
          onClick={() => navigate('/liturgico/reservas?from=calendar')}
          className="text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110 shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' 
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Calendar className="w-5 h-5" />
          Realizar Reserva
        </motion.button>
      </PageHeader>

      {/* Leyenda de tipos de actos */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-medium text-gray-700">Tipos de actos:</span>
          {Object.entries(LITURGICAL_TYPES).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: value.color }}
              />
              <span className="text-sm text-gray-600">{value.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Calendario */}
      <Card className="p-6">
        <div className="h-[750px]">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Calendar className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No hay actos litúrgicos programados
                </h3>
                <p className="text-gray-500 mb-6">
                  No hay horarios programados en el rango visible. Realiza tu primera reserva para comenzar.
                </p>
                <motion.button
                  onClick={() => navigate('/liturgico/reservas?from=calendar')}
                  className="text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-all hover:brightness-110 shadow-md"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' 
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Calendar className="w-5 h-5" />
                  Realizar Primera Reserva
                </motion.button>
              </div>
            </div>
          ) : (
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              defaultView="month"
              views={['month', 'week', 'day', 'agenda']}
              messages={{
                next: "Siguiente",
                previous: "Anterior",
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
                agenda: "Agenda",
                date: "Fecha",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "No hay horarios programados en este rango",
                allDay: "Todo el día",
                work_week: "Semana laboral",
                yesterday: "Ayer",
                tomorrow: "Mañana",
                thisWeek: "Esta semana",
                nextWeek: "Próxima semana",
                lastWeek: "Semana pasada",
                showMore: total => `+ Ver ${total} más`,
              }}
              eventPropGetter={eventStyleGetter}
              components={{
                event: EventComponent
              }}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              culture="es"
              formats={{
                dayFormat: 'EEEE d',
                weekdayFormat: 'EEEE',
                monthHeaderFormat: 'MMMM yyyy',
                dayHeaderFormat: 'EEEE, d MMMM',
                dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                  `${localizer.format(start, 'd MMM', culture)} - ${localizer.format(end, 'd MMM', culture)}`,
                agendaHeaderFormat: ({ start, end }, culture, localizer) =>
                  `${localizer.format(start, 'd MMM', culture)} - ${localizer.format(end, 'd MMM yyyy', culture)}`,
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                  `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
                agendaTimeFormat: 'HH:mm',
                agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
                  `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
              }}
              popup
              popupOffset={{ x: 0, y: 5 }}
              step={30}
              timeslots={2}
              min={new Date(2024, 0, 1, 6, 0, 0)} // Hora mínima: 6:00 AM
              max={new Date(2024, 0, 1, 22, 0, 0)} // Hora máxima: 10:00 PM
            />
          )}
        </div>
      </Card>

      {/* Información adicional */}
      {events.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                Mostrando {events.length} horario{events.length !== 1 ? 's' : ''} programado{events.length !== 1 ? 's' : ''}
              </span>
            </div>
            <motion.button
              onClick={refetch}
              className="flex items-center gap-2 font-medium transition-colors"
              style={{ color: 'var(--primary)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </motion.button>
          </div>
        </Card>
      )}

      {/* Diálogo de confirmación */}
      <DialogoConfirmacion
        abierto={confirmOpen}
        titulo="Confirmar Reserva"
        mensaje="¿Desea hacer una reserva para esta fecha y hora?"
        onConfirmar={confirmReservation}
        onCancelar={() => {
          setConfirmOpen(false);
          setPendingReservation(null);
        }}
        confirmText="Sí, crear reserva"
        cancelText="Cancelar"
        isDanger={false}
      />

      {/* Diálogo de sin horarios programados */}
      <DialogoConfirmacion
        abierto={noSchedulesOpen}
        titulo="Sin Horarios Programados"
        mensaje="No hay horarios programados para esta fecha. Elija otra fecha."
        onConfirmar={() => setNoSchedulesOpen(false)}
        onCancelar={() => setNoSchedulesOpen(false)}
        confirmText="Entendido"
        cancelText="Cerrar"
        isDanger={false}
      />
    </div>
  );
};

export default Horarios;