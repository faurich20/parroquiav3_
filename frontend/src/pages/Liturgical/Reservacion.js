import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Search, Pencil, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import ModalReserva from '../../components/Modals/ModalReserva'; // <--- nuevo
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

// Función de geocoding con preferencia por coordenadas guardadas y cache local
const geocodeParroquia = async (parroquia) => {
  if (!parroquia) return null;

  const latFromDb = parseFloat(parroquia.par_latitud);
  const lngFromDb = parseFloat(parroquia.par_longitud);
  if (!Number.isNaN(latFromDb) && !Number.isNaN(lngFromDb)) {
    return { lat: latFromDb, lng: lngFromDb };
  }

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

  return null;
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
  const { authFetch, hasPermission, user } = useAuth();

  // Lógica de filtros según rol
  const filters = useMemo(() => {
    if (!user) return {};

    const roleName = user.role?.rol_nombre;
    const personaId = user.persona?.personaid;

    // 1. Usuario normal: solo ve sus propias reservas
    if (roleName === 'Usuario') {
      return { personaid: personaId };
    }

    // 2. Todos los demás roles (Admin, Párroco, Secretaria, etc.): ven TODAS las reservas
    return {};
  }, [user]);

  const { items, loading, error, createItem, updateItem, removeItem } = useLiturgicalReservations({
    autoList: true,
    filters
  });
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
  // Estado para coordenadas y control del mapa (usado por el efecto de geocoding)
  const [parroquiasCoords, setParroquiasCoords] = useState({});
  const [mapKey, setMapKey] = useState(0);
  // Hook personalizado para geocoding de parroquias
  // Estado para modal de pago
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    pago_medio: '',
    pago_monto: '',
    // Datos adicionales para tarjeta
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: ''
  });

  // Permisos para reservas (módulo)
  const canCreate = hasPermission('liturgico_reservas_crear');
  const canEdit = hasPermission('liturgico_reservas_editar');
  const canDelete = hasPermission('liturgico_reservas_eliminar');
  const canView = hasPermission('liturgico_reservas_ver');

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

  // Cargar horarios en montaje inicial
  useEffect(() => {
    loadHorarios();
  }, [loadHorarios]);

  // Abrir modal automáticamente si viene desde el calendario con params
  useEffect(() => {
    const from = searchParams.get('from');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const horarioid = searchParams.get('horarioid');

    if (from === 'calendar' && (date || time || horarioid)) {
      // Prefijar valores iniciales
      setCurrent(prev => ({
        ...(prev || {}),
        h_fecha: date || '',
        h_hora: time || '',
        horarioid: horarioid || ''
      }));
      setModalMode('add');
      setModalOpen(true);
    }
  }, [searchParams]);

  // Cargar horarios cuando cambia parroquia / fecha en edición
  useEffect(() => {
    if (!modalOpen) return;

    const parroquiaId = current?.parroquiaid;
    const fecha = current?.h_fecha;

    console.log('🔄 Cargando horarios para:', { parroquiaId, fecha, modalMode });

    if (parroquiaId && fecha) {
      // Si hay parroquia Y fecha, filtrar por ambos
      loadHorarios(parroquiaId, fecha);
    } else if (parroquiaId) {
      // Si solo hay parroquia (sin fecha), filtrar solo por parroquia
      loadHorarios(parroquiaId, null);
    } else if (fecha) {
      // Si solo hay fecha (sin parroquia), filtrar solo por fecha
      loadHorarios(null, fecha);
    } else {
      // Si no hay filtros, cargar todos los horarios
      loadHorarios();
    }
  }, [modalOpen, modalMode, current?.parroquiaid, current?.h_fecha, loadHorarios]);

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
                  if (f.dependsOn) {
                    const fieldDependsOnArray = Array.isArray(f.dependsOn) ? f.dependsOn : [f.dependsOn];
                    const dependsOnChangedField = fieldDependsOnArray.some(dep => dep === campo.name);
                    if (dependsOnChangedField) {
                      setCurrent(prev => ({ ...prev, [f.name]: '' }));
                    }
                  }
                });
              }}
              placeholder={campo.placeholder}
              min={campo.min}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                // Limpiar campos dependientes
                fields.forEach(f => {
                  if (f.dependsOn) {
                    const fieldDependsOnArray = Array.isArray(f.dependsOn) ? f.dependsOn : [f.dependsOn];
                    const dependsOnChangedField = fieldDependsOnArray.some(dep => dep === campo.name);
                    if (dependsOnChangedField) {
                      setCurrent(prev => ({ ...prev, [f.name]: '' }));
                    }
                  }
                });
              }}
              placeholder={campo.placeholder}
              rows={campo.rows || 3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-vertical"
            />
          </div>
        );

      case 'select':
        let selectOptions = campo.options || [];
        if (campo.dependsOn && campo.optionsFilter && typeof campo.optionsFilter === 'function') {
          const dependsOnArray = Array.isArray(campo.dependsOn) ? campo.dependsOn : [campo.dependsOn];
          const dependValues = dependsOnArray.reduce((acc, dep) => {
            acc[dep] = (current || {})[dep];
            return acc;
          }, {});

          const hasAllDependencies = dependsOnArray.every(dep => dependValues[dep]);
          if (hasAllDependencies) {
            const filteredOptions = campo.optionsFilter(dependValues[dependsOnArray[0]], current || {});
            selectOptions = [{ value: '', label: campo.placeholder || 'Seleccione una opción' }, ...filteredOptions];
          }
        }

        // Lógica especial para el campo Estado con botón Realizar Pago
        if (campo.name === 'res_estado') {
          return (
            <div key={campo.name}>
              <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
              <div className="flex items-center gap-3">
                <select
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    fields.forEach(f => {
                      if (f.dependsOn) {
                        const fieldDependsOnArray = Array.isArray(f.dependsOn) ? f.dependsOn : [f.dependsOn];
                        const dependsOnChangedField = fieldDependsOnArray.some(dep => dep === campo.name);
                        if (dependsOnChangedField) {
                          setCurrent(prev => ({ ...prev, [f.name]: '' }));
                        }
                      }
                    });
                  }}
                  disabled={campo.dependsOn && (() => {
                    const dependsOnArray = Array.isArray(campo.dependsOn) ? campo.dependsOn : [campo.dependsOn];
                    return !dependsOnArray.every(dep => (current || {})[dep]);
                  })()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  {selectOptions.map((opt) => (
                    <option key={String(opt.value ?? opt)} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
                {value === 'false' && (
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
                    className="px-3 py-2 text-sm text-white rounded-lg hover:brightness-110"
                    style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    💳 Realizar Pago
                  </motion.button>
                )}
              </div>
            </div>
          );
        }

        // Caso general para otros selects (incluye indicadores del mapa)
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
                fields.forEach(f => {
                  if (f.dependsOn) {
                    const fieldDependsOnArray = Array.isArray(f.dependsOn) ? f.dependsOn : [f.dependsOn];
                    const dependsOnChangedField = fieldDependsOnArray.some(dep => dep === campo.name);
                    if (dependsOnChangedField) {
                      setCurrent(prev => ({ ...prev, [f.name]: '' }));
                    }
                  }
                });
              }}
              disabled={campo.dependsOn && (() => {
                const dependsOnArray = Array.isArray(campo.dependsOn) ? campo.dependsOn : [campo.dependsOn];
                return !dependsOnArray.every(dep => (current || {})[dep]);
              })()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {selectOptions.map((opt) => (
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
        return (
          <div key={campo.name}>
            {campo.render && campo.render(value, setValue, current || {}, modalMode === 'view')}
          </div>
        );
    }
  };

  // Función para renderizar modal de pago
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
        title={`💳 Pagar Reserva #${current?.reservaid || 'Nueva'}`}
        icon={Calendar}
        onClose={() => setPaymentModalOpen(false)}
        size="lg"
        closeOnOverlay={false}
      >
        <div className="space-y-6 p-6">
          {/* Información de la reserva */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">📋 Detalles de la Reserva</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Persona:</strong> {current?.persona_nombre || 'N/A'}</div>
              <div><strong>Fecha:</strong> {current?.h_fecha || 'N/A'}</div>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💰 Método de Pago
            </label>
            <select
              value={paymentData.pago_medio}
              onChange={(e) => setPaymentData(prev => ({ ...prev, pago_medio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="">Seleccione método de pago</option>
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💲 Monto a Pagar
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S/</span>
              <input
                type="number"
                value={paymentData.pago_monto}
                onChange={(e) => setPaymentData(prev => ({ ...prev, pago_monto: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Campos adicionales según método de pago */}
          {paymentData.pago_medio === 'Tarjeta' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-md">💳 Datos de la Tarjeta</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Tarjeta
                  </label>
                  <input
                    type="text"
                    value={paymentData.cardNumber}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Expiración
                  </label>
                  <input
                    type="text"
                    value={paymentData.expiryDate}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={paymentData.cvv}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cvv: e.target.value }))}
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre en la Tarjeta
                  </label>
                  <input
                    type="text"
                    value={paymentData.cardHolder}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cardHolder: e.target.value }))}
                    placeholder="JUAN PEREZ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                <p className="text-sm text-gray-500 mt-2">
                  Monto: S/ {paymentData.pago_monto || '0.00'}
                </p>
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

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                // Lógica para pagar después (estado pendiente)
                console.log('Pagar después:', paymentData);
                setPaymentModalOpen(false);
              }}
              className="px-4 py-2 border border-yellow-300 rounded-lg hover:bg-yellow-50 text-yellow-700 hover:text-yellow-800"
            >
              ⏰ Pagar Después
            </button>
            <button
              type="button"
              onClick={async () => {
                console.log('💳 [FRONTEND] Botón Pagar Ahora clickeado');
                console.log('💳 [FRONTEND] paymentData:', paymentData);
                console.log('💳 [FRONTEND] current:', current);

                try {
                  // Validar datos del pago
                  if (!paymentData.pago_medio) {
                    alert('Seleccione un método de pago');
                    return;
                  }
                  if (!paymentData.pago_monto || parseFloat(paymentData.pago_monto) <= 0) {
                    alert('Ingrese un monto válido');
                    return;
                  }

                  console.log('💳 [FRONTEND] Validación exitosa, actualizando estado...');

                  // Mostrar mensaje de éxito
                  alert('✅ Pago Exitoso - Estado actualizado a Pagado');

                  // Actualizar el estado local en el modal de reserva
                  setCurrent(prev => {
                    console.log('💳 [FRONTEND] Actualizando current con pago_data:', {
                      ...prev,
                      pago_estado: 'pagado',
                      estado_texto: 'Pagado',
                      pago_data: {
                        pago_medio: paymentData.pago_medio,
                        pago_monto: parseFloat(paymentData.pago_monto),
                        pago_descripcion: `Pago por reserva litúrgica - ${prev?.persona_nombre || 'N/A'}`,
                        pago_fecha: new Date().toISOString(),
                        pago_estado: 'pagado'
                      }
                    });

                    return {
                      ...prev,
                      pago_estado: 'pagado',
                      estado_texto: 'Pagado',
                      // Guardar datos del pago para usarlos después
                      pago_data: {
                        pago_medio: paymentData.pago_medio,
                        pago_monto: parseFloat(paymentData.pago_monto),
                        pago_descripcion: `Pago por reserva litúrgica - ${prev?.persona_nombre || 'N/A'}`,
                        pago_fecha: new Date().toISOString(),
                        pago_estado: 'pagado'
                      }
                    };
                  });

                  // Cerrar modal de pago
                  setPaymentModalOpen(false);

                  // Resetear datos de pago
                  setPaymentData({
                    pago_medio: '',
                    pago_monto: '',
                    cardNumber: '',
                    expiryDate: '',
                    cvv: '',
                    cardHolder: ''
                  });

                } catch (error) {
                  console.error('❌ [FRONTEND] Error procesando pago:', error);
                  alert('❌ Error al procesar pago: ' + error.message);
                }
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

  const normalizeDateValue = useCallback((value) => {
    if (!value) return '';
    const str = value.toString();
    if (str.includes('T')) return str.split('T')[0];
    return str;
  }, []);

  const normalizeTimeValue = useCallback((value) => {
    if (!value) return '';
    const str = value.toString();
    if (str.length >= 5) return str.slice(0, 5);
    if (str.length === 4) return `0${str}`;
    return str;
  }, []);

  // Función para preparar datos de reserva para edición con información completa
  const prepareEditData = useCallback((reserva) => {
    if (!reserva) return {};

    const horario = horarios.find(h => String(h.horarioid) === String(reserva.horarioid));
    const parroquiaId = reserva.parroquiaid ?? horario?.parroquiaid ?? null;
    const parroquia = parroquias.find(p => String(p.parroquiaid) === String(parroquiaId));
    const parroquiaNombre = parroquia
      ? `${parroquia.par_nombre} - ${parroquia.par_direccion} (${parroquia.dis_nombre})`
      : 'Parroquia no encontrada';

    const fechaBase = normalizeDateValue(reserva.h_fecha || horario?.h_fecha || '');
    const horaBase = normalizeTimeValue(reserva.h_hora || horario?.h_hora || '');
    const actoLabel = horario?.acto_titulo || horario?.acto_nombre || reserva.acto_titulo || reserva.acto_nombre || 'Sin título';

    const parroquiaIdStr = parroquiaId != null ? String(parroquiaId) : '';
    const horarioIdStr = reserva.horarioid != null
      ? String(reserva.horarioid)
      : horario?.horarioid != null
        ? String(horario.horarioid)
        : '';

    const fechaFormateada = fechaBase || 'Fecha no especificada';
    let horarioLabel = 'Horario no encontrado';
    if (horario || fechaBase || horaBase) {
      const fechaTexto = fechaBase;
      const horaTexto = horaBase ? ` ${horaBase}` : '';
      horarioLabel = `${fechaTexto}${horaTexto} - ${actoLabel}`.trim();
    }

    return {
      ...reserva,
      // Campos para mostrar en modo edición
      h_fecha_display: fechaFormateada,
      parroquia_display: parroquiaNombre,
      horario_display: horarioLabel,
      // Mantener datos clave para la edición/envío
      parroquiaid: parroquiaIdStr,
      horarioid: horarioIdStr,
      h_fecha: fechaBase,
      h_hora: horaBase,
      persona_nombre: reserva.persona_nombre || reserva.res_persona_nombre || '',
      res_descripcion: reserva.res_descripcion || '',
      pago_estado: reserva.pago_estado || 'pendiente'
    };
  }, [normalizeDateValue, normalizeTimeValue, parroquias, horarios]);

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
      width: '10%',
      render: (r) => {
        const estado = r.pago_estado || 'pendiente';
        let bgColor = 'bg-gray-100 text-gray-700';
        let texto = 'Pendiente';

        if (estado === 'pagado') {
          bgColor = 'bg-green-100 text-green-700';
          texto = 'Pagado';
        } else if (estado === 'pendiente') {
          bgColor = 'bg-yellow-100 text-yellow-700';
          texto = 'Pendiente';
        } else if (estado === 'vencido') {
          bgColor = 'bg-orange-100 text-orange-700';
          texto = 'Vencido';
        } else if (estado === 'fallido') {
          bgColor = 'bg-red-100 text-red-700';
          texto = 'Fallido';
        }

        return (
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
            {texto}
          </span>
        );
      }
    },
    {
      key: 'monto',
      header: 'Monto',
      width: '8%',
      render: (r) => (
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {r.pago_monto ? `S/ ${Number(r.pago_monto).toFixed(2)}` : '-'}
        </span>
      )
    },
    buildActionColumn({
      onEdit: canEdit
        ? (row) => { setCurrent(prepareEditData(row)); setModalMode('edit'); setModalOpen(true); }
        : null,
      onDelete: canDelete ? (row) => handleDelete(row) : null,
      onView: canView
        ? (row) => { setCurrent(prepareEditData(row)); setModalMode('view'); setModalOpen(true); }
        : null,
      width: '30%'
    })
  ]), [prepareEditData, canEdit, canDelete, canView]);

  const displayItems = useMemo(() => items || [], [items]);

  // Preparar opciones de personas para el combobox
  const personasOptions = useMemo(() =>
    personas.map(p => ({
      value: p.personaid,
      label: `${p.per_nombres} ${p.per_apellidos}`.trim()
    })),
    [personas]
  );

  const fields = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    const getInitialValue = (fieldName, defaultValue = '') => {
      if (modalMode === 'add') {
        return defaultValue;
      }
      return current?.[fieldName] || defaultValue;
    };

    // Función para filtrar horarios - definida dentro del useMemo para acceder a horarios
    const filterHorarios = (parroquiaId, formValues) => {
      console.log('🔍 filterHorarios llamado:', { parroquiaId, formValues, horariosLength: horarios.length });

      if (!parroquiaId || !formValues?.h_fecha) {
        console.log('⚠️ Sin parroquiaId o fecha');
        return [];
      }

      const fechaSeleccionada = formValues.h_fecha;
      const parroquiaMatch = String(parroquiaId);

      const normalizedHorarios = (horarios || []).map(h => ({
        ...h,
        parroquiaid: String(h.parroquiaid),
        h_fecha: normalizeDateValue(h.h_fecha),
        h_hora: normalizeTimeValue(h.h_hora)
      }));

      const filtrados = normalizedHorarios.filter(h => {
        if (!h.parroquiaid || !h.h_fecha) return false;
        const match = h.parroquiaid === parroquiaMatch && h.h_fecha === fechaSeleccionada;
        return match; // Mostrar TODOS los horarios que coincidan, tengan o no cupos
      });

      console.log('✅ Horarios filtrados:', filtrados.length);

      return filtrados.map(h => {
        const tieneCupos = h.disponibles === undefined || h.disponibles === null || h.disponibles > 0;
        const cuposTexto = h.disponibles !== undefined && h.disponibles !== null
          ? (h.disponibles > 0 ? ` (${h.disponibles} cupos)` : ' (COMPLETO)')
          : '';

        return {
          value: h.horarioid,
          label: `${h.h_hora || ''} - ${h.acto_titulo || h.acto_nombre || 'Sin título'}${cuposTexto}`.trim(),
          disabled: !tieneCupos // Marcar como deshabilitado si no tiene cupos
        };
      });
    };

    const baseFields = [
      {
        name: 'h_fecha',
        label: 'Fecha',
        type: 'date',
        placeholder: today,
        defaultValue: today,
        getInitialValue: () => getInitialValue('h_fecha', today),
        disabled: modalMode === 'view', // Solo deshabilitar en VIEW, no en EDIT
        min: today,
        onChange: (newFecha) => {
          // Actualizar current para que el useEffect detecte el cambio
          console.log('📅 Fecha cambiada a:', newFecha);
          setCurrent(prev => ({ ...prev, h_fecha: newFecha, horarioid: '' }));
        }
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
        ],
        getInitialValue: () => getInitialValue('parroquiaid', ''),
        disabled: modalMode === 'view', // Solo deshabilitar en VIEW, no en EDIT
        onChange: (newParroquiaId, allValues) => {
          // Solo actualizar current - el useEffect se encargará de llamar loadHorarios
          console.log('🔄 Parroquia cambiada a:', newParroquiaId);
          setCurrent(prev => ({ ...prev, parroquiaid: newParroquiaId, horarioid: '' }));
        }
      },
      {
        name: 'horarioid',
        label: 'Horario',
        type: 'custom',
        getInitialValue: () => getInitialValue('horarioid', ''),
        disabled: modalMode === 'view',
        dependsOn: ['parroquiaid', 'h_fecha'],
        render: (value, setValue, allValues, disabled) => {
          // Obtener valores actuales de parroquia y fecha
          const parroquiaId = allValues.parroquiaid || current?.parroquiaid;
          const fecha = allValues.h_fecha || current?.h_fecha;

          console.log('🎨 Renderizando horarioid:', { value, parroquiaId, fecha, modalMode, horariosLength: horarios.length });

          // Generar opciones filtradas
          let opciones = [{ value: '', label: 'Seleccione un horario' }];

          if (parroquiaId && fecha) {
            const horariosFiltrados = filterHorarios(parroquiaId, { h_fecha: fecha });
            opciones = [
              { value: '', label: 'Seleccione un horario' },
              ...horariosFiltrados
            ];
            console.log('📋 Opciones generadas:', opciones.length);
          }

          // Encontrar el horario actual para mostrar información
          const horarioActual = horarios.find(h => String(h.horarioid) === String(value));

          return (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Horario {modalMode === 'edit' && '(editable)'}
              </label>

              {/* Mostrar info del horario actual en modo edición */}
              {modalMode === 'edit' && horarioActual && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <div className="font-medium text-blue-700">
                    ⏰ Actual: {horarioActual.h_hora || 'Sin hora'} - {horarioActual.acto_titulo || horarioActual.acto_nombre || 'Sin título'}
                  </div>
                  <div className="text-xs text-blue-600">
                    📅 {horarioActual.h_fecha || 'Sin fecha'}
                  </div>
                </div>
              )}

              {/* Select para elegir/cambiar horario */}
              <select
                value={value || ''}
                onChange={(e) => {
                  console.log('🔄 Horario cambiado a:', e.target.value);
                  setValue(e.target.value);
                }}
                disabled={disabled || !parroquiaId || !fecha}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {opciones.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    style={opt.disabled ? { color: '#999', fontStyle: 'italic' } : undefined}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Mensajes de ayuda */}
              {!parroquiaId && !disabled && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Seleccione primero una parroquia
                </p>
              )}
              {parroquiaId && !fecha && !disabled && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Seleccione una fecha
                </p>
              )}
              {parroquiaId && fecha && opciones.length === 1 && !disabled && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ❌ No hay horarios programados para esta fecha y parroquia
                </p>
              )}
              {parroquiaId && fecha && opciones.length > 1 && !disabled && (() => {
                const conCupos = opciones.filter(o => !o.disabled).length - 1; // -1 por la opción "Seleccione"
                const sinCupos = opciones.filter(o => o.disabled).length;
                const total = opciones.length - 1; // -1 por la opción "Seleccione"

                if (conCupos === 0 && sinCupos > 0) {
                  return (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ❌ {total} horario(s) encontrado(s) pero todos están completos
                    </p>
                  );
                } else if (conCupos > 0) {
                  return (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      ✅ {conCupos} horario(s) con cupos disponibles
                      {sinCupos > 0 && <span className="text-gray-600"> ({sinCupos} completo{sinCupos > 1 ? 's' : ''})</span>}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          );
        }
      },
      {
        name: 'persona_nombre',
        label: 'Persona',
        type: 'combobox',
        options: personasOptions,
        placeholder: 'Seleccione o escriba el nombre',
        getInitialValue: () => getInitialValue('persona_nombre', ''),
        disabled: modalMode === 'view'
      },
      {
        name: 'res_descripcion',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Descripción de la reserva',
        getInitialValue: () => getInitialValue('res_descripcion', ''),
        disabled: modalMode === 'view',
        rows: 3
      },
      {
        name: 'pago_estado',
        label: 'Estado del Pago',
        type: 'select',
        options: [
          { value: 'pendiente', label: 'Pendiente' },
          { value: 'pagado', label: 'Pagado' },
          { value: 'vencido', label: 'Vencido' },
          { value: 'fallido', label: 'Fallido' }
        ],
        placeholder: 'Seleccione estado',
        getInitialValue: () => getInitialValue('pago_estado', 'pendiente'),
        disabled: modalMode === 'view' // Ahora es editable en modo edit/add
      }
    ];

    return baseFields;
  }, [modalMode, personasOptions, horarios, parroquias, current, normalizeDateValue, normalizeTimeValue]);


  // Función de validación que depende del modalMode
  const validate = useMemo(() => {
    return (v) => {
      // En modo edición, no validar campos que están deshabilitados
      if (modalMode === 'edit') {
        // res_descripcion ya no es obligatorio
        return '';
      }

      // Validar fecha: no permitir fechas pasadas
      if (v.h_fecha) {
        const today = format(new Date(), 'yyyy-MM-dd');
        if (v.h_fecha < today) {
          return 'No se pueden seleccionar fechas pasadas';
        }
      }

      if (!v.parroquiaid) return 'Seleccione una parroquia';
      if (!v.horarioid) return 'Seleccione un horario';
      // res_descripcion es opcional ahora
      return '';
    };
  }, [modalMode]);

  const handleSubmit = async (values) => {
    console.log('🚀 [FRONTEND] handleSubmit iniciado');
    console.log('🚀 [FRONTEND] modalMode:', modalMode);
    console.log('🚀 [FRONTEND] values:', values);

    try {
      if (modalMode === 'add') {
        console.log('🚀 [FRONTEND] Modo agregar');

        // Preparar payload con datos de reserva y pago (si existen)
        const payload = {
          ...values,
          horarioid: parseInt(values.horarioid),
          // Asegurar que campos vacíos se envíen como null o string vacía según corresponda
          pago_medio: values.pago_medio || null,
          pago_monto: values.pago_monto || null,
          pago_descripcion: values.pago_descripcion || null,
          pago_estado: values.pago_estado || 'pendiente'
        };

        return await createItem(payload);
      }

      if (modalMode === 'edit') {
        console.log('🚀 [FRONTEND] Modo editar');

        const payload = {
          horarioid: Number(values.horarioid || current?.horarioid),
          persona_nombre: (values.persona_nombre ?? current?.persona_nombre ?? current?.res_persona_nombre ?? '').trim(),
          res_descripcion: (values.res_descripcion ?? current?.res_descripcion ?? '').trim(),
          // Incluir campos de pago para actualización
          pago_medio: values.pago_medio || null,
          pago_monto: values.pago_monto || null,
          pago_descripcion: values.pago_descripcion || null,
          pago_estado: values.pago_estado || null
        };

        return await updateItem(current?.reservaid || current?.id, payload);
      }

      console.log('🚀 [FRONTEND] Modo no soportado');
      return { success: false, error: 'Modo no soportado' };
    } catch (error) {
      console.error('❌ [FRONTEND] Error en handleSubmit:', error);
      alert('❌ Error: ' + error.message);
      return { success: false, error: error.message };
    }
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
        {canCreate && (
          <motion.button
            onClick={() => { setCurrent({}); setModalMode('add'); setModalOpen(true); }}
            className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Nueva Reserva
          </motion.button>
        )}
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
              striped
              headerSticky
              emptyText="No hay reservas"
            />
          );
        })()}
      </Card>

      {/* Modal reutilizado para nueva reserva (mapa + formulario) */}
      <ModalReserva
        isOpen={modalOpen && modalMode === 'add'}
        initialValues={current || {}}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}    // handleSubmit espera values y creará la reserva
        authFetch={authFetch}
      />

      {/* Modal de pago */}
      {renderPaymentModal()}

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
