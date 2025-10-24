import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Search, Pencil, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import useLiturgicalReservations from '../../hooks/useLiturgicalReservations';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { buildActionColumn } from '../../components/Common/ActionColumn';
import { useAuth } from '../../contexts/AuthContext';
import ModalBase from '../../components/Modals/ModalBase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  // Verificar cache local primero
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    console.log('Usando coordenadas del cache para:', parroquia.par_nombre);
    return JSON.parse(cached);
  }

  // Geocoding con Nominatim
  try {
    const query = `${parroquia.par_direccion}, ${parroquia.dis_nombre}, Lambayeque, Perú`;
    const encodedQuery = encodeURIComponent(query);

    console.log('Geocoding parroquia:', parroquia.par_nombre, '- Query:', query);

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`);
    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };

      console.log('Geocoding exitoso para', parroquia.par_nombre, ':', coords);

      // Guardar en cache local
      localStorage.setItem(cacheKey, JSON.stringify(coords));

      return coords;
    } else {
      console.log('Geocoding falló para', parroquia.par_nombre, '- usando coordenadas por defecto');
    }
  } catch (error) {
    console.error('Error en geocoding para', parroquia.par_nombre, ':', error);
  }

  // Fallback a coordenadas hardcodeadas por distrito
  return getFallbackCoords(parroquia.dis_nombre);
};

// Coordenadas de fallback por distrito
const getFallbackCoords = (distrito) => {
  const fallbacks = {
    'LAMBAYEQUE': { lat: -6.7063, lng: -79.9066 },
    'CHICLAYO': { lat: -6.7651, lng: -79.8542 },
    'JOSE LEONARDO ORTIZ': { lat: -6.7596, lng: -79.8538 },
    // Coordenadas por defecto para distritos desconocidos
    'default': { lat: -6.7714, lng: -79.8409 }
  };

  return fallbacks[distrito] || fallbacks.default;
};

// Iconos personalizados para cada parroquia
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

const Reservacion = () => {
  const { items, loading, error, createItem, updateItem, removeItem } = useLiturgicalReservations({ autoList: true });
  const { authFetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [current, setCurrent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [parroquias, setParroquias] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mapKey, setMapKey] = useState(0);
  // Hook personalizado para geocoding de parroquias
  const [parroquiasCoords, setParroquiasCoords] = useState({});

  // Geocoding de todas las parroquias cuando se cargan
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
      console.log('Geocoding completado para todas las parroquias:', coordsMap);
    };

    geocodeAllParroquias();
  }, [parroquias]);

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

  // Cargar horarios
  useEffect(() => {
    const loadHorarios = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/liturgical/horarios');
        if (resp?.ok) {
          const data = await resp.json();
          setHorarios(data.items || []);
        }
      } catch (err) {
        console.error('Error cargando horarios:', err);
      }
    };
    loadHorarios();
  }, [authFetch]);

  // Función para renderizar modal personalizada con mapa
  const renderReservationModal = () => {
    if (!modalOpen || modalMode !== 'add') return null;

    return (
      <ModalBase
        isOpen={modalOpen}
        title="Nueva Reserva"
        icon={Calendar}
        onClose={() => setModalOpen(false)}
        size="xl"
        closeOnOverlay={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Columna izquierda: Mapa */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
              <span className="text-2xl">🗺️</span>
              Ubicación de Parroquias
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              {/* Mapa interactivo con marcadores individuales usando React Leaflet */}
              <div className="w-full rounded overflow-hidden" style={{ height: 600 }}>
                <MapContainer
                  key={mapKey}
                  center={[-6.7437, -79.8715]} // Centro promedio calculado
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Marcadores dinámicos para cada parroquia usando geocoding */}
                  {Object.entries(parroquiasCoords).map(([parroquiaId, { coords, parroquia }]) => (
                    <Marker
                      key={parroquiaId}
                      position={[coords.lat, coords.lng]}
                      icon={createCustomIcon('⛪')}
                      eventHandlers={{
                        mouseover: (e) => {
                          e.target.openPopup();
                        },
                        mouseout: (e) => {
                          e.target.closePopup();
                        },
                        click: (e) => {
                          // Mantener funcionalidad de click también
                          e.target.openPopup();
                        }
                      }}
                    >
                      <Popup>
                        <div className="text-sm p-2">
                          <div className="font-bold text-lg mb-1">{parroquia.par_nombre}</div>
                          <div className="text-gray-600 mb-1">{parroquia.par_direccion}</div>
                          <div className="text-gray-500 mb-2">{parroquia.dis_nombre}</div>
                          <div className="text-green-600 text-xs font-mono">
                            📍 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                          </div>
                          <div className="text-blue-600 text-xs mt-1">
                            Geocodificado automáticamente
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Columna derecha: Formulario */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
              <span className="text-2xl">📋</span>
              Información de la Reserva
            </div>

            {/* Renderizar campos del formulario aquí */}
            <div className="space-y-4">
              {fields.map((field) => renderField(field))}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black hover:text-gray-900"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Lógica para crear reserva
                  const validationError = validate(current || {});
                  if (validationError) {
                    alert(validationError);
                    return;
                  }
                  const result = await handleSubmit(current || {});
                  if (result?.success) {
                    setModalOpen(false);
                  } else {
                    alert(result?.error || 'Error al crear reserva');
                  }
                }}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:brightness-110"
                style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
              >
                Crear Reserva
              </button>
            </div>
          </div>
        </div>
      </ModalBase>
    );
  };

  // Función para renderizar campos del formulario
  const renderField = (campo) => {
    const value = (current || {})[campo.name] || '';
    const setValue = (v) => setCurrent(prev => ({ ...prev, [campo.name]: v }));

    switch (campo.type) {
      case 'text':
      case 'email':
      case 'date':
      case 'time':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <input
              type={campo.type}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                // Limpiar campos dependientes
                fields.forEach(f => {
                  if (f.dependsOn && (current || {})[f.dependsOn]) {
                    setCurrent(prev => ({ ...prev, [f.name]: '' }));
                  }
                });
              }}
              placeholder={campo.placeholder}
              min={campo.min}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        );
      case 'select':
        let selectOptions = campo.options || [];
        if (campo.dependsOn && campo.optionsFilter && typeof campo.optionsFilter === 'function') {
          const dependValue = (current || {})[campo.dependsOn];
          const filteredOptions = campo.optionsFilter(dependValue, current || {});
          selectOptions = [{ value: '', label: campo.placeholder || 'Seleccione una opción' }, ...filteredOptions];
        }

        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <select
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                // Limpiar campos dependientes
                fields.forEach(f => {
                  if (f.dependsOn && (current || {})[f.dependsOn]) {
                    setCurrent(prev => ({ ...prev, [f.name]: '' }));
                  }
                });
              }}
              disabled={campo.dependsOn && !(current || {})[campo.dependsOn]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {selectOptions.map((opt) => (
                <option key={String(opt.value ?? opt)} value={opt.value ?? opt}>
                  {opt.label ?? opt}
                </option>
              ))}
            </select>
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
      case 'textarea':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={campo.placeholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Usar solo datos reales de la API
  const displayItems = items || [];

  const columns = useMemo(() => ([
    {
      key: 'persona',
      header: 'Persona',
      width: '12%',
      render: (r) => (
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {r.persona_nombre || r.personaid || 'N/A'}
        </span>
      )
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      width: '20%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.res_descripcion || 'N/A'}
        </span>
      )
    },
    {
      key: 'fecha_hora',
      header: 'Fecha/Hora',
      width: '13%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.h_fecha && r.h_hora ? `${r.h_fecha} ${r.h_hora}` : 'N/A'}
        </span>
      )
    },
    {
      key: 'acto',
      header: 'Acto',
      width: '13%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.acto_titulo || r.acto_nombre || 'N/A'}
        </span>
      )
    },
    {
      key: 'estado',
      header: 'Estado',
      width: '7%',
      render: (r) => {
        const estadoTexto = r.res_estado ? 'Cancelado' : 'Sin pagar';
        const bgColor = r.res_estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        return (
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
            {estadoTexto}
          </span>
        );
      }
    },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setModalMode('edit'); setModalOpen(true); },
      onDelete: (row) => handleDelete(row),
      onView: (row) => { setCurrent(row); setModalMode('view'); setModalOpen(true); },
      width: '35%'
    })
  ]), []);

  // Preparar opciones de personas para el combobox
  const personasOptions = useMemo(() =>
    personas.map(p => ({
      value: p.personaid,
      label: `${p.per_nombres} ${p.per_apellidos}`.trim()
    })),
    [personas]
  );

  const fields = useMemo(() => {
    // Obtener fecha actual para el placeholder y validación
    const today = format(new Date(), 'yyyy-MM-dd');

    // Función para filtrar horarios - definida dentro del useMemo para acceder a horarios
    const filterHorarios = (parroquiaId, formValues) => {
      if (!parroquiaId || !formValues?.h_fecha) return [];
      // Filtrar horarios por parroquia y fecha seleccionada
      const fechaSeleccionada = formValues.h_fecha;
      const filtrados = (horarios || []).filter(h => {
        if (!h.parroquiaid || !h.h_fecha) return false;
        // Normalizar fechas para comparación (remover hora si existe)
        const horarioFecha = h.h_fecha.split('T')[0]; // Obtener solo yyyy-MM-dd
        return h.parroquiaid === parseInt(parroquiaId) &&
               horarioFecha === fechaSeleccionada;
      });
      return filtrados.map(h => ({
        value: h.horarioid,
        label: `${h.h_hora} - ${h.acto_titulo || h.acto_nombre}`
      }));
    };

    const baseFields = [
      {
        name: 'h_fecha',
        label: 'Fecha',
        type: 'date',
        placeholder: today,
        defaultValue: today,
        disabled: modalMode === 'view',
        min: today // Solo permitir fechas desde hoy en adelante
      },
      {
        name: 'parroquiaid',
        label: 'Parroquia',
        type: 'select',
        options: [{ value: '', label: 'Seleccione una parroquia' }, ...parroquias.map(p => ({
          value: p.parroquiaid,
          label: `${p.par_nombre} - ${p.par_direccion} (${p.dis_nombre})`
        }))],
        disabled: modalMode === 'view'
      },
      {
        name: 'horarioid',
        label: 'Horario',
        type: 'select',
        options: [{ value: '', label: 'Seleccione un horario' }],
        disabled: modalMode === 'view',
        dependsOn: 'parroquiaid', // Ahora depende de la parroquia seleccionada
        optionsFilter: filterHorarios
      },
      {
        name: 'persona_nombre',
        label: 'Persona',
        type: 'combobox',
        options: personasOptions,
        placeholder: 'Seleccione o escriba el nombre',
        disabled: modalMode === 'view',
        editable: true
      },
      { name: 'res_descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Descripción de la reserva' },
      { name: 'res_estado', label: 'Estado', type: 'select', options: [
        { value: false, label: 'Sin pagar' },
        { value: true, label: 'Cancelado' },
      ] },
    ];

    return baseFields;
  }, [modalMode, personasOptions, horarios, parroquias]);

  const validate = (v) => {
    // Validar fecha: no permitir fechas pasadas
    if (v.h_fecha) {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (v.h_fecha < today) {
        return 'No se pueden seleccionar fechas pasadas';
      }
    }

    if (!v.parroquiaid) return 'Seleccione una parroquia';
    if (!v.horarioid) return 'Seleccione un horario';
    if (!v.res_descripcion?.trim()) return 'Ingrese la descripción';
    return '';
  };

  const handleSubmit = async (values) => {
    if (modalMode === 'add') return await createItem(values);
    if (modalMode === 'edit') return await updateItem(current?.reservaid || current?.id, values);
    return { success: false, error: 'Modo no soportado' };
  };

  const handleDelete = async (row) => {
    setDeleteTarget(row.reservaid || row.id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    setConfirmOpen(false);
    setDeleteTarget(null);
    if (!id) return;
    const r = await removeItem(id);
    if (!r.success) {
      alert(r.error || 'Error al eliminar');
    }
    // La lista se actualiza automáticamente por el hook
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas de Actos Litúrgicos"
        subtitle="Gestiona las reservas y citas"
        icon={Calendar}
      >
        <motion.button
          onClick={() => { setCurrent({ status: 'pendiente' }); setModalMode('add'); setModalOpen(true); }}
          className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Nueva Reserva
        </motion.button>
      </PageHeader>

      <Card>
        {/* Buscador */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar por Acto, Persona, Estado o Notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl focus:ring-2 transition"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)'
              }}
            />
          </div>
        </div>

        {/* Tabla */}
        {(() => {
          const term = (searchTerm || '').toLowerCase();
          const filtered = (displayItems || []).filter(r =>
            String(r.acto_titulo || r.acto_nombre || '').toLowerCase().includes(term) ||
            String(r.persona_nombre || '').toLowerCase().includes(term) ||
            String(r.res_descripcion || '').toLowerCase().includes(term) ||
            String(r.estado_texto || '').toLowerCase().includes(term)
          );
          return (
            <TablaConPaginacion
              columns={columns}
              data={filtered}
              rowKey={(r) => r.id || r.reservaid}
              searchTerm={searchTerm}
              searchKeys={['acto_titulo', 'acto_nombre', 'persona_nombre', 'res_descripcion', 'estado_texto']}
              itemsPerPage={7}
              striped
              headerSticky
              emptyText="No hay reservas"
            />
          );
        })()}
      </Card>

      {/* Modal personalizado para nueva reserva con mapa */}
      {renderReservationModal()}

      {/* Modal estándar para editar/ver reservas */}
      <ModalCrudGenerico
        isOpen={modalOpen && modalMode !== 'add'}
        mode={modalMode}
        title={modalMode === 'edit' ? 'Editar Reserva' : 'Detalle de Reserva'}
        icon={Calendar}
        initialValues={current || {}}
        fields={fields}
        validate={validate}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        size="lg"
      />

      <DialogoConfirmacion
        abierto={confirmOpen}
        titulo="Eliminar reserva"
        mensaje="¿Estás seguro de eliminar esta reserva? Esta acción no se puede deshacer."
        onConfirmar={confirmDelete}
        onCancelar={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default Reservacion;
