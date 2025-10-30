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
import ModalBase from '../../components/Modals/ModalBase';
import ModalReserva from '../../components/Modals/ModalReserva';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import useLiturgicalCalendar from '../../hooks/useLiturgicalCalendar';
import useLiturgicalReservations from '../../hooks/useLiturgicalReservations';
import { LITURGICAL_TYPES } from '../../constants/liturgical';
import { useAuth } from '../../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EditableCombobox from '../../components/Form/EditableCombobox'; // <-- nueva importación

// Configurar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Función de geocoding con Nominatim y cache local
const geocodeParroquia = async (parroquia) => {
  const cacheKey = `coords_${parroquia.parroquiaid}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const query = `${parroquia.par_direccion}, ${parroquia.dis_nombre}, Lambayeque, Perú`;
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`);
    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      localStorage.setItem(cacheKey, JSON.stringify(coords));
      return coords;
    }
  } catch (error) {
    console.error('Error en geocoding:', error);
  }

  return getFallbackCoords(parroquia.dis_nombre);
};

const getFallbackCoords = (distrito) => {
  const fallbacks = {
    'LAMBAYEQUE': { lat: -6.7063, lng: -79.9066 },
    'CHICLAYO': { lat: -6.7651, lng: -79.8542 },
    'JOSE LEONARDO ORTIZ': { lat: -6.7596, lng: -79.8538 },
    'default': { lat: -6.7714, lng: -79.8409 }
  };
  return fallbacks[distrito] || fallbacks.default;
};

const createCustomIcon = (label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: #3b82f6;
      color: white;
      border-radius: 50%;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${label}</div>`,
    iconSize: [35, 35],
    iconAnchor: [17.5, 35],
    popupAnchor: [0, -35]
  });
};

// Configuración de localización para español
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const Horarios = () => {
  const { items, loading, error, refetch } = useLiturgicalCalendar();
  const { createItem } = useLiturgicalReservations({ autoList: false });
  const { user, authFetch } = useAuth();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [noSchedulesOpen, setNoSchedulesOpen] = useState(false);

  // Estados para el modal de reserva
  const [reservaModalOpen, setReservaModalOpen] = useState(false);
  const [reservaData, setReservaData] = useState({});
  const [parroquias, setParroquias] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [parroquiasCoords, setParroquiasCoords] = useState({});
  const [mapKey, setMapKey] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    pago_medio: '',
    pago_monto: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: ''
  });

  // Filtro por parroquia para el calendario
  const [selectedParroquia, setSelectedParroquia] = useState('');

  // Entrada editable para el filtro de parroquia
  const [parroquiaInput, setParroquiaInput] = useState('');

  // Opciones preparadas para el combobox (label/value)
  const parroquiasOptions = useMemo(() => (
    parroquias.map(p => ({
      value: String(p.parroquiaid),
      label: `${p.par_nombre} - ${p.par_direccion} (${p.dis_nombre})`
    }))
  ), [parroquias]);

  // Cargar parroquias
  useEffect(() => {
    const loadParroquias = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/parroquias');
        if (resp?.ok) {
          const data = await resp.json();
          setParroquias(data.parroquias || []);
        }
      } catch (err) {
        console.error('Error cargando parroquias:', err);
      }
    };
    loadParroquias();
  }, [authFetch]);

  // Cargar personas
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/personas');
        if (resp?.ok) {
          const data = await resp.json();
          setPersonas(data.personas || []);
        }
      } catch (err) {
        console.error('Error cargando personas:', err);
      }
    };
    loadPersonas();
  }, [authFetch]);

  // Geocoding de parroquias
  useEffect(() => {
    const geocodeAllParroquias = async () => {
      if (!parroquias.length) return;
      const coordsPromises = parroquias.map(async (parroquia) => {
        const coords = await geocodeParroquia(parroquia);
        return { parroquiaid: parroquia.parroquiaid, coords, parroquia };
      });
      const results = await Promise.all(coordsPromises);
      const coordsMap = {};
      results.forEach(({ parroquiaid, coords, parroquia }) => {
        coordsMap[parroquiaid] = { coords, parroquia };
      });
      setParroquiasCoords(coordsMap);
    };
    geocodeAllParroquias();
  }, [parroquias]);

  // Cargar horarios
  const loadHorarios = useCallback(async (parroquiaId = null, fecha = null) => {
    try {
      const params = new URLSearchParams();
      if (parroquiaId) params.append('parroquiaid', parroquiaId);
      if (fecha) params.append('fecha', fecha);
      const url = params.toString()
        ? `http://localhost:5000/api/liturgical/horarios?${params.toString()}`
        : 'http://localhost:5000/api/liturgical/horarios';
      const resp = await authFetch(url);
      if (resp?.ok) {
        const data = await resp.json();
        setHorarios(data.items || data || []);
      }
    } catch (err) {
      console.error('Error cargando horarios:', err);
    }
  }, [authFetch]);

  // ----------------------------------------------------------
  // MOVIDO: handler para el combobox editable definido **DESPUÉS**
  // de la función loadHorarios para evitar TDZ / ReferenceError
  // ----------------------------------------------------------
  const handleParroquiaInputChange = useCallback((text) => {
    setParroquiaInput(text || '');
    if (!text || text.trim() === '') {
      // limpiar filtro
      setSelectedParroquia('');
      loadHorarios();
      return;
    }

    // buscar coincidencia exacta por label (case-insensitive)
    const match = parroquiasOptions.find(opt => String(opt.label).toLowerCase() === String(text).toLowerCase());
    if (match) {
      setSelectedParroquia(match.value);
      loadHorarios(match.value);
    } else {
      // Si no hay coincidencia exacta, no aplicamos filtro aún (el usuario está escribiendo)
      setSelectedParroquia('');
    }
  }, [parroquiasOptions, loadHorarios]);

  // Cuando el usuario selecciona una parroquia para filtrar, cargar horarios filtrados
  const handleParroquiaFilter = useCallback((parroquiaId) => {
    setSelectedParroquia(parroquiaId);
    if (parroquiaId) {
      loadHorarios(parroquiaId);
    } else {
      // quitar filtro: recargar todos los horarios (si se desea mantener vacíos, se puede setear([]))
      loadHorarios();
    }
  }, [loadHorarios]);

  // Cargar horarios cuando cambian parroquia/fecha en el modal
  useEffect(() => {
    if (!reservaModalOpen) return;
    const parroquiaId = reservaData?.parroquiaid;
    const fecha = reservaData?.h_fecha;
    if (parroquiaId && fecha) {
      loadHorarios(parroquiaId, fecha);
    } else {
      loadHorarios();
    }
  }, [reservaModalOpen, reservaData?.parroquiaid, reservaData?.h_fecha, loadHorarios]);

  // Recargar calendario cuando el usuario vuelve a estar autenticado
  useEffect(() => {
    if (user && refetch) {
      refetch();
    }
  }, [user, refetch]);

  // Mapear los datos (si hay filtro por parroquia usamos `horarios`, sino usamos `items`)
  const events = useMemo(() => {
	// Helper: extrae el id de parroquia desde varias formas posibles
	const extractParroquiaId = (obj) => {
		if (!obj) return '';
		// campos directos
		if (obj.parroquiaid) return String(obj.parroquiaid);
		if (obj.parroquia_id) return String(obj.parroquia_id);
		if (obj.parid) return String(obj.parid);
		// objeto anidado (por ejemplo: { parroquia: { parroquiaid: ... } })
		if (obj.parroquia && (obj.parroquia.parroquiaid || obj.parroquia.id)) {
			return String(obj.parroquia.parroquiaid ?? obj.parroquia.id);
		}
		// fallback a posible campo en 'raw'
		if (obj.raw) {
			return extractParroquiaId(obj.raw);
		}
		return '';
	};

	const sourceIsHorarios = !!selectedParroquia;

	if (sourceIsHorarios) {
		// Si la API devolvió horarios para la parroquia, úsalos
		if (horarios && horarios.length > 0) {
			return horarios.map(h => {
				try {
					const eventDate = h.h_fecha;
					const eventTime = h.h_hora;
					if (!eventDate || !eventTime) return null;
					const startDateTime = new Date(`${eventDate}T${eventTime}:00`);
					if (isNaN(startDateTime.getTime())) return null;
					const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));
					return {
						id: h.horarioid,
						title: h.acto_titulo || h.acto_nombre || h.act_nombre || 'Sin título',
						start: startDateTime,
						end: endDateTime,
						location: h.parroquia_nombre || h.par_nombre || 'Sin ubicación',
						// Usar el nombre real del acto (act_nombre / acto_nombre) para que coincida con LITURGICAL_TYPES
						type: h.acto_nombre || h.act_nombre || h.acto_tipo || h.type || 'misa',
						allDay: false,
						reservas_count: h.reservas_count || 0,
						reservas_activas_count: h.reservas_activas_count || 0,
						raw: h
					};
				} catch (err) {
					console.error('Error procesando horario (horarios):', h, err);
					return null;
				}
			}).filter(Boolean);
		}

		// FALLBACK: si horarios está vacío por algún motivo, filtrar items del hook por parroquiaid
		if (items && items.length > 0) {
			return items
				.filter(it => {
					const pid = extractParroquiaId(it);
					return pid && String(pid) === String(selectedParroquia);
				})
				.map(event => {
					try {
						const eventDate = event.date || event.h_fecha;
						const eventTime = event.time || event.h_hora;
						if (!eventDate || !eventTime) return null;
						const startDateTime = new Date(`${eventDate}T${eventTime}:00`);
						if (isNaN(startDateTime.getTime())) return null;
						const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));
						return {
							id: event.horarioid ?? event.id,
							title: event.title || event.acto_titulo || event.acto_nombre || event.act_nombre || 'Sin título',
							start: startDateTime,
							end: endDateTime,
							location: event.location || event.parroquia_nombre || 'Sin ubicación',
							// Intentar obtener el tipo desde acto/act_nombre antes de usar el tipo genérico
							type: event.type || event.acto_nombre || event.acto_titulo || event.acto_tipo || 'misa',
							allDay: false,
							reservas_count: event.reservas_count || 0,
							reservas_activas_count: event.reservas_activas_count || 0,
							raw: event
						};
					} catch (err) {
						console.error('Error procesando item (fallback por parroquia):', event, err);
						return null;
					}
				})
				.filter(Boolean);
		}

		// Si no hay nada, retornar arreglo vacío
		return [];
	}

	// Comportamiento original: usar items del hook
	if (!items || items.length === 0) return [];
	return items.map(event => {
		try {
			const eventDate = event.date;
			const eventTime = event.time;
			if (!eventDate || !eventTime) return null;
			const startDateTime = new Date(`${eventDate}T${eventTime}:00`);
			if (isNaN(startDateTime.getTime())) return null;
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
				actoliturgicoid: event.actoliturgicoid,
				raw: event // mantener referencia al objeto original
			};
		} catch (error) {
			console.error('Error procesando horario:', event, error);
			return null;
		}
	}).filter(Boolean);
}, [items, horarios, selectedParroquia]);

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
      const { dateStr, timeStr, horarioid, parroquiaid } = pendingReservation;
      setReservaData({
        h_fecha: dateStr,
        h_hora: timeStr,
        horarioid: horarioid || '',
        parroquiaid: parroquiaid || (selectedParroquia || ''), // PREFILL parroquia si viene del filtro
        persona_nombre: '',
        res_descripcion: '',
        pago_estado: 'pendiente'
      });
      setReservaModalOpen(true);
    }
    setConfirmOpen(false);
    setPendingReservation(null);
  }, [pendingReservation, selectedParroquia]);

  // REEMPLAZA handleSelectSlot por esta versión mejorada
  const handleSelectSlot = useCallback(({ start, end }) => {
    if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return;
    }
    if (confirmOpen || noSchedulesOpen) return;

    try {
      const today = startOfDay(new Date());
      const selectedDate = startOfDay(start);
      if (isBefore(selectedDate, today)) return;

      const dateStr = format(start, 'yyyy-MM-dd');
      const timeStr = format(start, 'HH:mm');

      // Buscar un evento EXACTO en la misma fecha/hora (si existe)
      const matchingEvent = events.find(evt => {
        try {
          return evt.start instanceof Date && evt.start.getTime() === start.getTime();
        } catch { return false; }
      });

      if (!matchingEvent) {
        // si no hay evento preciso pero sí hay eventos en el día, mostrar aviso o permitir crear sin horario
        const hasEventsForDay = events.some(evt => startOfDay(evt.start).getTime() === selectedDate.getTime());
        if (!hasEventsForDay) {
          setNoSchedulesOpen(true);
          return;
        }

        // Crear reserva sin horario (usuario escogerá)
        setPendingReservation({ dateStr, timeStr, horarioid: null, parroquiaid: selectedParroquia || null });
        setConfirmOpen(true);
        return;
      }

      // Si hay un evento exacto, pre-llenar con su horario y parroquia (si están disponibles)
      const raw = matchingEvent.raw || {};
      const horarioId = raw.horarioid || matchingEvent.id;
      const parroquiaId = raw.parroquiaid || raw.parroquia?.parroquiaid || selectedParroquia || null;

      setPendingReservation({ dateStr, timeStr, horarioid: horarioId, parroquiaid: parroquiaId });
      setConfirmOpen(true);
    } catch (error) {
      console.error('Error en handleSelectSlot:', error);
    }
  }, [confirmOpen, noSchedulesOpen, events, selectedParroquia]);

  // Reemplazar handleSelectEvent por la versión que busca en `events` y normaliza campos
  const handleSelectEvent = useCallback((clicked) => {
    if (!clicked || !clicked.id) return;
    if (confirmOpen) return;

    try {
      const ev = events.find(e => String(e.id) === String(clicked.id));
      if (!ev) {
        let fallback = (horarios || []).find(h => String(h.horarioid) === String(clicked.id));
        if (!fallback && items && items.length) {
          fallback = items.find(it => String(it.horarioid) === String(clicked.id) || String(it.id) === String(clicked.id));
        }
        if (fallback) {
          const fecha = fallback.h_fecha || fallback.date;
          const hora = fallback.h_hora || fallback.time;
          if (fecha) {
            const today = startOfDay(new Date());
            const eventDate = startOfDay(new Date(fecha));
            if (isBefore(eventDate, today)) return;
            setPendingReservation({
              dateStr: fecha,
              timeStr: hora,
              horarioid: fallback.horarioid || fallback.id,
              parroquiaid: fallback.parroquiaid || (fallback.parroquia && (fallback.parroquia.parroquiaid || fallback.parroquia.id)) || selectedParroquia || null
            });
            setConfirmOpen(true);
            return;
          }
        }
        return;
      }

      // ev puede provenir de 'horarios' o de 'items' mapeados; usar ev.raw si existe
      const raw = ev.raw || {};
      const fecha = raw.h_fecha || raw.date || (ev.start ? format(ev.start, 'yyyy-MM-dd') : '');
      const hora = raw.h_hora || raw.time || (ev.start ? format(ev.start, 'HH:mm') : '');
      const parroquiaId = raw.parroquiaid || raw.parroquia?.parroquiaid || selectedParroquia || null;
      const horarioId = raw.horarioid || raw.id || ev.id;

      if (fecha) {
        const today = startOfDay(new Date());
        const eventDate = startOfDay(new Date(fecha));
        if (isBefore(eventDate, today)) return;
        setPendingReservation({
          dateStr: fecha,
          timeStr: hora,
          horarioid: horarioId,
          parroquiaid: parroquiaId
        });
        setConfirmOpen(true);
      }
    } catch (err) {
      console.error('Error al abrir detalle del evento:', err);
    }
  }, [confirmOpen, events, horarios, items, selectedParroquia]);

  // Función para renderizar campos del modal de reserva
  const renderField = (campo) => {
    const value = reservaData[campo.name] || '';
    const setValue = (v) => setReservaData(prev => ({ ...prev, [campo.name]: v }));

    switch (campo.type) {
      case 'date':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <input
              type="date"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setReservaData(prev => ({ ...prev, horarioid: '' }));
              }}
              min={campo.min}
              disabled={campo.disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        );
      case 'select':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              {campo.label}
              {campo.name === 'parroquiaid' && value && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  🗺️ Seleccionada desde el mapa
                </span>
              )}
            </label>
            <select
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (campo.name === 'parroquiaid') {
                  setReservaData(prev => ({ ...prev, horarioid: '' }));
                }
              }}
              disabled={campo.disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {campo.options.map((opt) => (
                <option key={String(opt.value ?? opt)} value={opt.value ?? opt}>
                  {opt.label ?? opt}
                </option>
              ))}
            </select>
            {campo.name === 'parroquiaid' && !value && (
              <p className="text-xs text-blue-600 mt-1">
                💡 También puedes seleccionar una parroquia haciendo clic en el mapa
              </p>
            )}
          </div>
        );
      case 'textarea':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={campo.placeholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-vertical"
            />
          </div>
        );
      case 'combobox':
        const listId = `${campo.name}-datalist`;
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={campo.placeholder}
              list={listId}
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <datalist id={listId}>
              {(campo.options || []).map((opt, idx) => (
                <option key={opt.value || idx} value={opt.label || opt.value}>
                  {opt.label || opt.value}
                </option>
              ))}
            </datalist>
          </div>
        );
      case 'custom':
        return campo.render(value, setValue, reservaData);
      default:
        return null;
    }
  };

  // Definir campos del formulario
  const today = format(new Date(), 'yyyy-MM-dd');
  const personasOptions = personas.map(p => ({
    value: p.personaid,
    label: `${p.per_nombres} ${p.per_apellidos}`.trim()
  }));

  const fields = [
    {
      name: 'h_fecha',
      label: 'Fecha',
      type: 'date',
      min: today,
      disabled: !!reservaData.h_fecha // Deshabilitar si viene pre-llenado
    },
    {
      name: 'parroquiaid',
      label: 'Parroquia',
      type: 'select',
      options: [
        { value: '', label: 'Seleccione una parroquia' },
        ...parroquias.map(p => ({
          value: p.parroquiaid,
          label: `${p.par_nombre} - ${p.par_direccion} (${p.dis_nombre})`
        }))
      ]
    },
    {
      name: 'horarioid',
      label: 'Horario',
      type: 'custom',
      render: (value, setValue, allValues) => {
        const parroquiaId = allValues.parroquiaid;
        const fecha = allValues.h_fecha;

        let opciones = [{ value: '', label: 'Seleccione un horario' }];
        if (parroquiaId && fecha) {
          const horariosFiltrados = horarios
            .filter(h => String(h.parroquiaid) === String(parroquiaId) && h.h_fecha === fecha)
            .map(h => ({
              value: h.horarioid,
              label: `${h.h_hora || ''} - ${h.acto_titulo || h.acto_nombre || 'Sin título'}`
            }));
          opciones = [{ value: '', label: 'Seleccione un horario' }, ...horariosFiltrados];
        }

        return (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Horario</label>
            <select
              value={value || ''}
              onChange={(e) => setValue(e.target.value)}
              disabled={!parroquiaId || !fecha}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100"
            >
              {opciones.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {!parroquiaId && <p className="text-xs text-amber-600 mt-1">⚠️ Seleccione primero una parroquia</p>}
            {parroquiaId && !fecha && <p className="text-xs text-amber-600 mt-1">⚠️ Seleccione una fecha</p>}
            {parroquiaId && fecha && opciones.length === 1 && <p className="text-xs text-red-600 mt-1">❌ No hay horarios disponibles</p>}
          </div>
        );
      }
    },
    {
      name: 'persona_nombre',
      label: 'Persona',
      type: 'combobox',
      options: personasOptions,
      placeholder: 'Seleccione o escriba el nombre'
    },
    {
      name: 'res_descripcion',
      label: 'Descripción',
      type: 'textarea',
      placeholder: 'Descripción de la reserva'
    },
    {
      name: 'estado_label',
      label: 'Estado',
      type: 'custom',
      render: (value, setValue, allValues) => {
        const estadoValue = allValues.pago_estado || 'pendiente';
        return (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
            <div className="flex items-center gap-3">
              <span className={`inline-block px-3 py-2 text-sm font-medium rounded-lg ${
                estadoValue === 'pendiente' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                estadoValue === 'pagado' ? 'bg-green-100 text-green-700 border border-green-200' :
                'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {estadoValue.charAt(0).toUpperCase() + estadoValue.slice(1)}
              </span>
              {estadoValue !== 'pagado' && (
                <motion.button
                  onClick={() => {
                    setPaymentModalOpen(true);
                    setPaymentData({
                      pago_medio: '',
                      pago_monto: '',
                      cardNumber: '',
                      expiryDate: '',
                      cvv: '',
                      cardHolder: ''
                    });
                  }}
                  className="px-3 py-2 text-white rounded-lg hover:brightness-110 text-sm w-full"
                  style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  💳 Realizar Pago
                </motion.button>
              )}
            </div>
          </div>
        );
      }
    }
  ];

  // Validación
  const validate = (v) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (v.h_fecha && v.h_fecha < today) return 'No se pueden seleccionar fechas pasadas';
    if (!v.parroquiaid) return 'Seleccione una parroquia';
    if (!v.horarioid) return 'Seleccione un horario';
    // res_descripcion ahora es opcional (nullable) -> no forzar su ingreso
    return '';
  };

  // Manejar envío de reserva
  const handleSubmitReserva = async (values) => {
    // values proviene del ModalReserva (payload preparado)
    try {
      // Si onSubmit pasa payload ya procesado, se puede usar directamente.
      // En caso contrario aceptar objeto con las propiedades esperadas.
      const payload = {
        horarioid: Number(values.horarioid || reservaData.horarioid),
        persona_nombre: values.persona_nombre || reservaData.persona_nombre,
        res_descripcion: values.res_descripcion || reservaData.res_descripcion
      };

      if (values.pago_data || reservaData.pago_data) {
        const pago = values.pago_data || reservaData.pago_data;
        payload.pago_medio = pago.pago_medio;
        payload.pago_monto = pago.pago_monto;
        payload.pago_descripcion = pago.pago_descripcion;
        payload.pago_fecha = pago.pago_fecha;
        payload.pago_estado = pago.pago_estado;
      }

      const result = await createItem(payload);
      if (result.success) {
        alert('✅ Reserva creada exitosamente');
        setReservaModalOpen(false);
        setReservaData({});
        refetch(); // Recargar calendario
      } else {
        alert(result.error || 'Error al crear reserva');
      }
      return result;
    } catch (error) {
      console.error('Error creando reserva:', error);
      alert('Error al crear reserva: ' + error.message);
      return { success: false, error: error.message };
    }
  };

  // Renderizar modal de pago
  const renderPaymentModal = () => {
    if (!paymentModalOpen) return null;

    const paymentMethods = [
      { value: 'Efectivo', label: '💵 Efectivo' },
      { value: 'Yape o Plin', label: '📱 Yape o Plin' },
      { value: 'Tarjeta', label: '💳 Tarjeta de Crédito/Débito' }
    ];

    return (
      <ModalBase
        isOpen={paymentModalOpen}
        title="💳 Realizar Pago"
        icon={Calendar}
        onClose={() => setPaymentModalOpen(false)}
        size="lg"
      >
        <div className="space-y-6 p-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">📋 Detalles de la Reserva</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Persona:</strong> {reservaData?.persona_nombre || 'N/A'}</div>
              <div><strong>Fecha:</strong> {reservaData?.h_fecha || 'N/A'}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💰 Método de Pago</label>
            <select
              value={paymentData.pago_medio}
              onChange={(e) => setPaymentData(prev => ({ ...prev, pago_medio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Seleccione método de pago</option>
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💲 Monto a Pagar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S/</span>
              <input
                type="number"
                value={paymentData.pago_monto}
                onChange={(e) => setPaymentData(prev => ({ ...prev, pago_monto: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          {paymentData.pago_medio === 'Tarjeta' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-md">💳 Datos de la Tarjeta</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Tarjeta</label>
                  <input
                    type="text"
                    value={paymentData.cardNumber}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Expiración</label>
                  <input
                    type="text"
                    value={paymentData.expiryDate}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    type="text"
                    value={paymentData.cvv}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cvv: e.target.value }))}
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre en la Tarjeta</label>
                  <input
                    type="text"
                    value={paymentData.cardHolder}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cardHolder: e.target.value }))}
                    placeholder="JUAN PEREZ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentData.pago_medio === 'Yape o Plin' && (
            <div className="text-center space-y-4">
              <h4 className="font-semibold text-md">📱 Escanea el QR</h4>
              <div className="bg-gray-100 p-8 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">📱</div>
                <p className="text-gray-600">QR Code para {paymentData.pago_medio}</p>
                <p className="text-sm text-gray-500 mt-2">Monto: S/ {paymentData.pago_monto || '0.00'}</p>
              </div>
            </div>
          )}

          {paymentData.pago_medio === 'Efectivo' && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <span className="text-xl">💵</span>
                <span className="font-medium">Pago en Efectivo</span>
              </div>
              <p className="text-green-600 text-sm mt-2">
                El pago se registrará como pendiente hasta que se confirme el efectivo recibido.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Pagar después:', paymentData);
                setPaymentModalOpen(false);
              }}
              className="px-4 py-2 border border-yellow-300 rounded-lg hover:bg-yellow-50 text-yellow-700"
            >
              ⏰ Pagar Después
            </button>
            <button
              type="button"
              onClick={() => {
                if (!paymentData.pago_medio) {
                  alert('Seleccione un método de pago');
                  return;
                }
                if (!paymentData.pago_monto || parseFloat(paymentData.pago_monto) <= 0) {
                  alert('Ingrese un monto válido');
                  return;
                }

                alert('✅ Pago Exitoso - Estado actualizado a Pagado');
                setReservaData(prev => ({
                  ...prev,
                  pago_estado: 'pagado',
                  pago_data: {
                    pago_medio: paymentData.pago_medio,
                    pago_monto: parseFloat(paymentData.pago_monto),
                    pago_descripcion: `Pago por reserva litúrgica - ${prev?.persona_nombre || 'N/A'}`,
                    pago_fecha: new Date().toISOString(),
                    pago_estado: 'pagado'
                  }
                }));
                setPaymentModalOpen(false);
                setPaymentData({
                  pago_medio: '',
                  pago_monto: '',
                  cardNumber: '',
                  expiryDate: '',
                  cvv: '',
                  cardHolder: ''
                });
              }}
              className="px-4 py-2 text-white rounded-lg hover:brightness-110"
              style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
            >
              ✅ Pagar Ahora
            </button>
          </div>
        </div>
      </ModalBase>
    );
  };

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

      {/* Filtro por Parroquia */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filtrar por Parroquia:</label>

          {/* Reemplazado select por EditableCombobox */}
          <div style={{ width: 420 }}>
            <EditableCombobox
              value={parroquiaInput}
              onChange={handleParroquiaInputChange}
              options={parroquiasOptions}
              placeholder="Escriba o seleccione una parroquia..."
              id="filter-parroquia"
            />
          </div>

        </div>
      </Card>

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
              min={new Date(2024, 0, 1, 6, 0, 0)}
              max={new Date(2024, 0, 1, 22, 0, 0)}
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

      {/* Modal de Nueva Reserva -> ahora usa ModalReserva */}
      <ModalReserva
        isOpen={reservaModalOpen}
        initialValues={reservaData}
        onClose={() => { setReservaModalOpen(false); setReservaData({}); }}
        onSubmit={handleSubmitReserva}
        authFetch={authFetch}
      />

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