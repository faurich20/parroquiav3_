import React, { useMemo, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import useLiturgicalCalendar from '../../hooks/useLiturgicalCalendar';
import { LITURGICAL_TYPES } from '../../constants/liturgical';

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
  const { items, loading, error } = useLiturgicalCalendar();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const navigate = useNavigate();

  // Datos de prueba para desarrollo (remover en producción)
  const testHorarios = [
    {
      id: 1,
      type: 'misa',
      title: 'Misa Dominical',
      start: new Date(2024, 0, 1, 10, 0), // Año, Mes (0-11), Día, Hora, Minuto
      end: new Date(2024, 0, 1, 11, 0),
      location: 'Capilla Principal',
      is_active: true
    },
    // ... otros eventos de prueba
  ];

  // Mapear los datos al formato que espera el calendario
  const events = useMemo(() => {
    const data = items.length > 0 ? items : testHorarios;
    return data.map(event => ({
      id: event.horarioid || event.id,
      title: `${event.title || event.act_titulo} - ${event.location || event.parroquia_nombre}`,
      start: new Date(`${event.date || event.h_fecha}T${event.time || event.h_hora}:00`),
      end: new Date(`${event.date || event.h_fecha}T${event.time || event.h_hora}:00`).getTime() + 3600000, // +1 hora
      location: event.location || event.parroquia_nombre,
      type: event.type || event.act_nombre,
      allDay: false
    }));
  }, [items]);

  // Estilos personalizados para los eventos
  const eventStyleGetter = (event) => {
    const backgroundColor = {
      misa: '#4f46e5',      // indigo-600
      bautismo: '#10b981',  // emerald-500
      matrimonio: '#ec4899', // pink-500
      confirmacion: '#f59e0b', // amber-500
      comunion: '#8b5cf6',   // violet-500
      exequias: '#6b7280'   // gray-500
    }[event.type] || '#3b82f6'; // azul por defecto

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        padding: '2px 8px',
        fontSize: '0.875rem'
      }
    };
  };

  // Componente personalizado para mostrar el evento
  const EventComponent = ({ event }) => (
    <div className="p-1">
      <div className="font-medium text-sm">{event.title.split(' - ')[0]}</div>
      <div className="text-xs opacity-90">{format(event.start, 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}</div>
      <div className="text-xs opacity-75">{event.location}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios Litúrgicos"
        subtitle="Visualiza los actos litúrgicos programados"
        icon={Clock}
      >
        <motion.button
          onClick={() => navigate('/liturgico/gestionar?from=calendar')}
          className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Acto Litúrgico
        </motion.button>
      </PageHeader>

      <Card className="p-4">
        <div className="h-[700px]">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor={(event) => new Date(event.end)}
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
              noEventsInRange: "No hay eventos programados",
              allDay: "Todo el día",
              work_week: "Semana laboral",
              yesterday: "Ayer",
              tomorrow: "Mañana",
              thisWeek: "Esta semana",
              nextWeek: "Próxima semana",
              lastWeek: "Semana pasada",
              showMore: total => `+ Ver más (${total})`,
            }}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent
            }}
            selectable
            onSelectSlot={({ start, end }) => {
              // Lógica para crear un nuevo evento al hacer clic en un espacio vacío
              console.log('Crear nuevo evento desde:', start, 'hasta:', end);
            }}
            culture="es"
            formats={{
              dayFormat: 'EEEE d',
              weekdayFormat: 'EEEE',
              monthHeaderFormat: 'MMMM yyyy',
              dayHeaderFormat: 'EEEE d',
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default Horarios;