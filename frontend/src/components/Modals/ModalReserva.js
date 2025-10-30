// src/components/Modals/ModalReserva.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ModalBase from './ModalBase';
import { Calendar } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import EditableCombobox from '../Form/EditableCombobox';
import 'leaflet/dist/leaflet.css';

// Configurar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getFallbackCoords = (distrito) => {
  const fallbacks = {
    'LAMBAYEQUE': { lat: -6.7063, lng: -79.9066 },
    'CHICLAYO': { lat: -6.7651, lng: -79.8542 },
    'JOSE LEONARDO ORTIZ': { lat: -6.7596, lng: -79.8538 },
    'default': { lat: -6.7714, lng: -79.8409 }
  };
  return fallbacks[distrito] || fallbacks.default;
};

const geocodeParroquia = async (parroquia) => {
  if (!parroquia) return getFallbackCoords('default');
  const cacheKey = `coords_${parroquia.parroquiaid}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);
  try {
    const query = `${parroquia.par_direccion || ''}, ${parroquia.dis_nombre || ''}, Lambayeque, Perú`;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const data = await res.json();
    if (data && data.length) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      localStorage.setItem(cacheKey, JSON.stringify(coords));
      return coords;
    }
  } catch (e) {
    // ignore
  }
  return getFallbackCoords(parroquia.dis_nombre);
};

const createCustomIcon = (label) => L.divIcon({
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
  iconSize: [35,35],
  iconAnchor: [17.5,35],
  popupAnchor: [0,-35]
});

const ModalReserva = ({ isOpen, onClose, initialValues = {}, onSubmit, authFetch }) => {
  const [data, setData] = useState({});
  const [parroquias, setParroquias] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [coordsMap, setCoordsMap] = useState({});
  const [mapKey, setMapKey] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState({ pago_medio:'', pago_monto:'', cardNumber:'', expiryDate:'', cvv:'', cardHolder:'' });

  // editable input text for parroquia
  const [parroquiaInput, setParroquiaInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setData({
        h_fecha: initialValues?.h_fecha || '',
        h_hora: initialValues?.h_hora || '',
        horarioid: initialValues?.horarioid || '',
        parroquiaid: initialValues?.parroquiaid || '',
        persona_nombre: initialValues?.persona_nombre || '',
        res_descripcion: initialValues?.res_descripcion || '',
        pago_estado: initialValues?.pago_estado || 'pendiente',
        pago_data: initialValues?.pago_data || undefined
      });
      setPaymentOpen(false);
      setPayment({ pago_medio:'', pago_monto:'', cardNumber:'', expiryDate:'', cvv:'', cardHolder:'' });
      // set visible label if parroquiaid provided
      if (initialValues?.parroquiaid) {
        // we'll set label after parroquias load (useEffect below)
      } else {
        setParroquiaInput('');
      }
    } else {
      setData({});
      setParroquiaInput('');
    }
  }, [isOpen, initialValues]);

  // load parroquias & personas
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const load = async () => {
      try {
        const r1 = await authFetch('http://localhost:5000/api/parroquias');
        if (r1?.ok) {
          const j = await r1.json();
          if (mounted) setParroquias(j.parroquias || []);
        }
        const r2 = await authFetch('http://localhost:5000/api/personas');
        if (r2?.ok) {
          const j2 = await r2.json();
          if (mounted) setPersonas(j2.personas || []);
        }
      } catch (e) {
        console.error('ModalReserva load error', e);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isOpen, authFetch]);

  // sync parroquiaInput label when parroquias list or initial parroquiaid changes
  useEffect(() => {
    if (!parroquias.length) return;
    const match = parroquias.find(p => String(p.parroquiaid) === String(data.parroquiaid || initialValues?.parroquiaid));
    if (match) {
      setParroquiaInput(`${match.par_nombre} - ${match.par_direccion} (${match.dis_nombre})`);
    }
  }, [parroquias, data.parroquiaid, initialValues?.parroquiaid]);

  // geocode parroquias
  useEffect(() => {
    if (!parroquias.length) return;
    let mounted = true;
    const geocodeAll = async () => {
      const results = await Promise.all(parroquias.map(async p => ({ id: p.parroquiaid, coords: await geocodeParroquia(p), parroquia: p })));
      if (!mounted) return;
      const map = {};
      results.forEach(r => { map[r.id] = { coords: r.coords, parroquia: r.parroquia }; });
      setCoordsMap(map);
      setMapKey(k => k + 1);
    };
    geocodeAll();
    return () => { mounted = false; };
  }, [parroquias]);

  const loadHorarios = useCallback(async (parroquiaId = null, fecha = null) => {
    try {
      const params = new URLSearchParams();
      if (parroquiaId) params.append('parroquiaid', parroquiaId);
      if (fecha) params.append('fecha', fecha);
      const url = params.toString() ? `http://localhost:5000/api/liturgical/horarios?${params.toString()}` : 'http://localhost:5000/api/liturgical/horarios';
      const r = await authFetch(url);
      if (r?.ok) {
        const j = await r.json();
        setHorarios(j.items || j || []);
      }
    } catch (e) {
      console.error('Error cargando horarios (ModalReserva)', e);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isOpen) return;
    const pid = data?.parroquiaid || null;
    const fecha = data?.h_fecha || null;
    if (pid && fecha) loadHorarios(pid, fecha);
    else loadHorarios();
  }, [isOpen, data?.parroquiaid, data?.h_fecha, loadHorarios]);

  // parroquiasOptions for combobox
  const parroquiasOptions = useMemo(() => parroquias.map(p => ({ value: String(p.parroquiaid), label: `${p.par_nombre} - ${p.par_direccion} (${p.dis_nombre})` })), [parroquias]);

  // handle changers for editable combobox (accept string)
  const handleParroquiaInputChange = useCallback((text) => {
    const t = String(text || '');
    setParroquiaInput(t);
    if (!t.trim()) {
      setData(prev => ({ ...prev, parroquiaid: '', horarioid: '' }));
      return;
    }
    const match = parroquiasOptions.find(opt => opt.label.toLowerCase() === t.toLowerCase());
    if (match) {
      setData(prev => ({ ...prev, parroquiaid: match.value, horarioid: '' }));
    } else {
      setData(prev => ({ ...prev, parroquiaid: '' }));
    }
  }, [parroquiasOptions]);

  // sync parroquiaInput -> data.parroquiaid when set programmatically (e.g., map click)
  useEffect(() => {
    if (!parroquiaInput) return;
    const match = parroquiasOptions.find(opt => opt.label.toLowerCase() === parroquiaInput.toLowerCase());
    if (match && String(data.parroquiaid) !== String(match.value)) {
      setData(prev => ({ ...prev, parroquiaid: match.value, horarioid: '' }));
    }
  }, [parroquiaInput, parroquiasOptions, data.parroquiaid]);

  const peopleOptions = personas.map(p => ({ value: p.personaid, label: `${p.per_nombres} ${p.per_apellidos}`.trim() }));
  const today = format(new Date(), 'yyyy-MM-dd');

  const setField = (name, value) => setData(prev => ({ ...prev, [name]: value }));

  const validate = (v) => {
    const t = format(new Date(), 'yyyy-MM-dd');
    if (v.h_fecha && v.h_fecha < t) return 'No se pueden seleccionar fechas pasadas';
    if (!v.parroquiaid) return 'Seleccione una parroquia';
    if (!v.horarioid) return 'Seleccione un horario';
    // res_descripcion ahora es opcional (nullable) -> no forzar su ingreso
    return '';
  };

  const handleCreate = async () => {
    const err = validate(data);
    if (err) { alert(err); return { success:false, error: err }; }
    try {
      const payload = {
        horarioid: parseInt(data.horarioid),
        persona_nombre: data.persona_nombre,
        res_descripcion: data.res_descripcion
      };
      if (data.pago_data) {
        payload.pago_medio = data.pago_data.pago_medio;
        payload.pago_monto = data.pago_data.pago_monto;
        payload.pago_descripcion = data.pago_data.pago_descripcion;
        payload.pago_fecha = data.pago_data.pago_fecha;
        payload.pago_estado = data.pago_data.pago_estado;
      }
      if (typeof onSubmit === 'function') {
        const res = await onSubmit(payload);
        return res;
      }
      return { success: true, payload };
    } catch (e) {
      console.error('ModalReserva submit error', e);
      return { success:false, error: e.message || String(e) };
    }
  };

  const renderPayment = () => {
    if (!paymentOpen) return null;
    const methods = [{ value:'Efectivo', label:'💵 Efectivo' }, { value:'Yape o Plin', label:'📱 Yape o Plin' }, { value:'Tarjeta', label:'💳 Tarjeta' }];
    return (
      <ModalBase isOpen={paymentOpen} title="💳 Realizar Pago" icon={Calendar} onClose={() => setPaymentOpen(false)} size="lg">
        <div className="space-y-6 p-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">📋 Detalles de la Reserva</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Persona:</strong> {data.persona_nombre || 'N/A'}</div>
              <div><strong>Fecha:</strong> {data.h_fecha || 'N/A'}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💰 Método de Pago</label>
            <select value={payment.pago_medio} onChange={(e)=>setPayment(prev=>({...prev,pago_medio:e.target.value}))} className="w-full px-3 py-2 border rounded-lg">
              <option value=''>Seleccione método</option>
              {methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💲 Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S/</span>
              <input type="number" value={payment.pago_monto} onChange={(e)=>setPayment(prev=>({...prev,pago_monto:e.target.value}))} className="w-full pl-12 pr-4 py-2 border rounded-lg" />
            </div>
          </div>

          {payment.pago_medio === 'Tarjeta' && (
            <div className="space-y-4">
              <input value={payment.cardNumber} onChange={(e)=>setPayment(prev=>({...prev,cardNumber:e.target.value}))} placeholder="Número de tarjeta" className="w-full px-3 py-2 border rounded-lg" />
              <div className="grid grid-cols-3 gap-3">
                <input value={payment.expiryDate} onChange={(e)=>setPayment(prev=>({...prev,expiryDate:e.target.value}))} placeholder="MM/YY" className="px-3 py-2 border rounded-lg" />
                <input value={payment.cvv} onChange={(e)=>setPayment(prev=>({...prev,cvv:e.target.value}))} placeholder="CVV" className="px-3 py-2 border rounded-lg" />
                <input value={payment.cardHolder} onChange={(e)=>setPayment(prev=>({...prev,cardHolder:e.target.value}))} placeholder="Nombre en tarjeta" className="px-3 py-2 border rounded-lg" />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={()=>setPaymentOpen(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
            <button onClick={()=>{
              if(!payment.pago_medio){ alert('Seleccione método'); return; }
              if(!payment.pago_monto || parseFloat(payment.pago_monto)<=0){ alert('Ingrese monto'); return; }
              setData(prev => ({ ...prev, pago_estado: 'pagado', pago_data: { pago_medio: payment.pago_medio, pago_monto: parseFloat(payment.pago_monto), pago_descripcion: `Pago por reserva - ${prev?.persona_nombre||'N/A'}`, pago_fecha: new Date().toISOString(), pago_estado: 'pagado' } }));
              setPaymentOpen(false);
            }} className="px-4 py-2 text-white rounded-lg" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}>✅ Pagar Ahora</button>
          </div>
        </div>
      </ModalBase>
    );
  };

  // fields definition (modal form)
  const fields = [
    { name:'h_fecha', label:'Fecha', type:'date', min: today, disabled: !!data.h_fecha },
    { name:'parroquiaid', label:'Parroquia', type:'custom',
      render: () => (
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Parroquia</label>
          <EditableCombobox value={parroquiaInput} onChange={handleParroquiaInputChange} options={parroquiasOptions} placeholder="Escriba o seleccione una parroquia" id="modal-parroquia" />
          {!parroquiaInput && <p className="text-xs text-blue-600 mt-1">💡 También puedes seleccionar una parroquia haciendo clic en el mapa</p>}
        </div>
      )
    },
    { name:'horarioid', label:'Horario', type:'custom',
      render: (value, setValue, allValues) => {
        const pid = data.parroquiaid;
        const fecha = data.h_fecha;
        let opts = [{ value:'', label:'Seleccione un horario' }];
        if (pid && fecha) {
          const f = horarios.filter(h => String(h.parroquiaid) === String(pid) && h.h_fecha === fecha)
            .map(h => ({ value: h.horarioid, label: `${h.h_hora || ''} - ${h.acto_titulo || h.acto_nombre || 'Sin título'}` }));
          opts = [{ value:'', label:'Seleccione un horario' }, ...f];
        }
        return (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Horario</label>
            <select value={value||''} onChange={(e)=>{ setValue(e.target.value); setData(prev=>({...prev, horarioid: e.target.value})); }} disabled={!pid || !fecha} className="w-full px-3 py-2 border rounded-lg">
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        );
      }
    },
    { name:'persona_nombre', label:'Persona', type:'combobox', options: peopleOptions, placeholder: 'Seleccione o escriba el nombre' },
    { name:'res_descripcion', label:'Descripción', type:'textarea', placeholder:'Descripción de la reserva' },
    { name:'estado_label', label:'Estado', type:'custom',
      render: () => {
        const estado = data.pago_estado || 'pendiente';
        return (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
            <div className="flex items-center gap-3">
              <span className={`inline-block px-3 py-2 text-sm font-medium rounded-lg ${estado==='pendiente'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{estado.charAt(0).toUpperCase()+estado.slice(1)}</span>
              {estado !== 'pagado' && (
                <button onClick={()=> setPaymentOpen(true)} className="px-3 py-2 text-white rounded-lg" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}>
                  💳 Realizar Pago
                </button>
              )}
            </div>
          </div>
        );
      }
    }
  ];

  // render principal
  return (
    <ModalBase isOpen={isOpen} title="Nueva Reserva" icon={Calendar} onClose={onClose} size="xl" closeOnOverlay={false}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-700"><span className="text-2xl">🗺️</span> Ubicación de Parroquias</div>
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <div style={{ height: 600 }} className="w-full">
              <MapContainer key={mapKey} center={[-6.7437, -79.8715]} zoom={10} style={{ height:'100%', width:'100%' }} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {Object.entries(coordsMap).map(([id, val]) => (
                  <Marker
                    key={id}
                    position={[val.coords.lat, val.coords.lng]}
                    icon={createCustomIcon('⛪')}
                    eventHandlers={{
                      click: () => {
                        const label = `${val.parroquia.par_nombre} - ${val.parroquia.par_direccion} (${val.parroquia.dis_nombre})`;
                        setData(prev => ({ ...prev, parroquiaid: id, horarioid: '' }));
                        setParroquiaInput(label);
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-bold">{val.parroquia.par_nombre}</div>
                        <div className="text-gray-600">{val.parroquia.par_direccion}</div>
                        <div className="text-gray-500 text-xs">{val.parroquia.dis_nombre}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-700"><span className="text-2xl">📋</span> Información de la Reserva</div>
          <div className="space-y-4">
            {fields.map(f => {
              // render custom types via f.render()
              if (f.type === 'custom') return <div key={f.name}>{f.render(data[f.name], (v)=>setField(f.name, v), data)}</div>;
              if (f.type === 'date') return (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-500 mb-1">{f.label}</label>
                  <input type="date" value={data[f.name]||''} onChange={(e)=>{ setField(f.name, e.target.value); setField('horarioid',''); }} min={f.min} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              );
              if (f.type === 'combobox') return (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-500 mb-1">{f.label}</label>
                  <input list={`${f.name}-list`} value={data[f.name]||''} onChange={(e)=>setField(f.name, e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                  <datalist id={`${f.name}-list`}>{(f.options||[]).map(opt=> <option key={opt.value} value={opt.label} />)}</datalist>
                </div>
              );
              if (f.type === 'textarea') return (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-500 mb-1">{f.label}</label>
                  <textarea value={data[f.name]||''} onChange={(e)=>setField(f.name, e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              );
              return null;
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => onClose()} className="flex-1 px-4 py-2 border rounded-lg">Cerrar</button>
            <button onClick={async () => {
              const res = await handleCreate();
              if (res?.success) { onClose(); setData({}); }
              else if (res?.error) alert(res.error || 'Error');
            }} className="flex-1 px-4 py-2 text-white rounded-lg" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}>Crear Reserva</button>
          </div>
        </div>
      </div>

      {renderPayment()}
    </ModalBase>
  );
};

export default ModalReserva;