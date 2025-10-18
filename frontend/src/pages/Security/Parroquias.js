import React, { useMemo, useState, useEffect } from 'react';
import { Church, Plus, Search, Edit, Trash2, Loader } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import ActionButton from '../../components/Common/ActionButton';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import useCrud from '../../hooks/useCrud';
import { buildActionColumn } from '../../components/Common/ActionColumn';
import { useAuth } from '../../contexts/AuthContext';

const ParroquiasPage = () => {
  const { items, loading, error, createItem, updateItem, removeItem } = useCrud('http://localhost:5000/api/parroquias');
  const { authFetch } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [current, setCurrent] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Datos de prueba para desarrollo (remover en producción)
  const testParroquias = [
    { parroquiaid: 1, par_nombre: 'Parroquia 1', par_direccion: 'Dirección 1', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'LAMBAYEQUE', par_telefono1: '123456789' },
    { parroquiaid: 2, par_nombre: 'Parroquia 2', par_direccion: 'Dirección 2', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'CHICLAYO', par_telefono1: '987654321' },
    { parroquiaid: 3, par_nombre: 'Parroquia 3', par_direccion: 'Dirección 3', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'JOSE LEONARDO ORTIZ', par_telefono1: '456789123' },
    { parroquiaid: 4, par_nombre: 'Parroquia 4', par_direccion: 'Dirección 4', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'LAMBAYEQUE', par_telefono1: '321654987' },
    { parroquiaid: 5, par_nombre: 'Parroquia 5', par_direccion: 'Dirección 5', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'CHICLAYO', par_telefono1: '654987321' },
    { parroquiaid: 6, par_nombre: 'Parroquia 6', par_direccion: 'Dirección 6', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'JOSE LEONARDO ORTIZ', par_telefono1: '789123456' },
    { parroquiaid: 7, par_nombre: 'Parroquia 7', par_direccion: 'Dirección 7', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'LAMBAYEQUE', par_telefono1: '147258369' },
    { parroquiaid: 8, par_nombre: 'Parroquia 8', par_direccion: 'Dirección 8', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'CHICLAYO', par_telefono1: '963852741' },
    { parroquiaid: 9, par_nombre: 'Parroquia 9', par_direccion: 'Dirección 9', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'JOSE LEONARDO ORTIZ', par_telefono1: '852741963' },
    { parroquiaid: 10, par_nombre: 'Parroquia 10', par_direccion: 'Dirección 10', dep_nombre: 'LAMBAYEQUE', prov_nombre: 'LAMBAYEQUE', dis_nombre: 'LAMBAYEQUE', par_telefono1: '741963852' },
  ];

  // Usar datos reales si están disponibles, sino usar datos de prueba
  const displayItems = items.length > 0 ? items : testParroquias;

  // Opciones de selects en cascada
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [selDepartamento, setSelDepartamento] = useState('');
  const [selProvincia, setSelProvincia] = useState('');

  // Cargar departamentos al montar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/geo/departamentos');
        if (resp?.ok) {
          const data = await resp.json();
          if (mounted) setDepartamentos((data.departamentos || []).map(d => ({ value: d.departamentoid, label: d.dep_nombre })));
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [authFetch]);

  // Cargar provincias según departamento seleccionado
  useEffect(() => {
    let mounted = true;
    if (!selDepartamento) { setProvincias([]); setSelProvincia(''); setDistritos([]); return; }
    (async () => {
      try {
        const resp = await authFetch(`http://localhost:5000/api/geo/provincias?departamentoid=${selDepartamento}`);
        if (resp?.ok) {
          const data = await resp.json();
          if (mounted) {
            setProvincias((data.provincias || []).map(p => ({ value: p.provinciaid, label: p.prov_nombre })));
            setSelProvincia('');
            setDistritos([]);
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [authFetch, selDepartamento]);

  // Cargar distritos según provincia seleccionada
  useEffect(() => {
    let mounted = true;
    if (!selProvincia) { setDistritos([]); return; }
    (async () => {
      try {
        const resp = await authFetch(`http://localhost:5000/api/geo/distritos?provinciaid=${selProvincia}`);
        if (resp?.ok) {
          const data = await resp.json();
          if (mounted) setDistritos((data.distritos || []).map(d => ({ value: d.distritoid, label: d.dis_nombre })));
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [authFetch, selProvincia]);

  // Precargar combos al abrir modal en editar/ver
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isModalOpen || !(modalMode === 'edit' || modalMode === 'view') || !current) return;

      const depId = current.departamentoid || '';
      const provId = current.provinciaid || '';

      try {
        if (depId) {
          setSelDepartamento(String(depId));
          const rProv = await authFetch(`http://localhost:5000/api/geo/provincias?departamentoid=${depId}`);
          if (mounted && rProv?.ok) {
            const dataProv = await rProv.json();
            const provOpts = (dataProv.provincias || []).map(p => ({ value: p.provinciaid, label: p.prov_nombre }));
            setProvincias(provOpts);
          }
        } else {
          setSelDepartamento('');
          setProvincias([]);
        }

        if (provId) {
          setSelProvincia(String(provId));
          const rDis = await authFetch(`http://localhost:5000/api/geo/distritos?provinciaid=${provId}`);
          if (mounted && rDis?.ok) {
            const dataDis = await rDis.json();
            const disOpts = (dataDis.distritos || []).map(d => ({ value: d.distritoid, label: d.dis_nombre }));
            setDistritos(disOpts);
          }
        } else {
          setSelProvincia('');
          setDistritos([]);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [isModalOpen, modalMode, current, authFetch]);

  const columns = useMemo(() => ([
    {
      key: 'nombre', header: 'Parroquia', width: '24%', render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
            <span className="text-white text-sm font-bold">{(row.par_nombre || 'P').charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{row.par_nombre}</p>
            <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{row.par_direccion}</p>
          </div>
        </div>
      )
    },
    { key: 'telefono', header: 'Teléfonos', width: '16%', render: (r) => (
      <span>{r.par_telefono1}{r.par_telefono2 ? ` / ${r.par_telefono2}` : ''}</span>
    ) },
    { key: 'departamento', header: 'Departamento', width: '10%', align: 'center', render: (r) => r.dep_nombre || '-' },
    { key: 'provincia', header: 'Provincia', width: '10%', align: 'center', render: (r) => r.prov_nombre || '-' },
    { key: 'distrito', header: 'Distrito', width: '10%', align: 'center', render: (r) => r.dis_nombre || '-' },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setModalMode('edit'); setIsModalOpen(true); },
      onDelete: (row) => { setDeleteTarget(row.parroquiaid); setConfirmOpen(true); },
      onView: (row) => { setCurrent(row); setModalMode('view'); setIsModalOpen(true); },
      width: '30%'
    })
  ]), []);

  const fields = useMemo(() => ([
    { name: 'par_nombre', label: 'Nombre', type: 'text', placeholder: 'Nombre de la parroquia' },
    { name: 'par_direccion', label: 'Dirección', type: 'text', placeholder: 'Dirección' },
    {
      name: 'departamentoid',
      label: 'Departamento',
      type: 'custom',
      render: (value, setValue, form, disabled) => (
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Departamento</label>
          <select
            className="w-full px-3 py-2 rounded-xl"
            style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            value={selDepartamento}
            onChange={(e) => { setSelDepartamento(e.target.value); }}
            disabled={disabled}
          >
            <option value="">Seleccione</option>
            {departamentos.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
      )
    },
    {
      name: 'provinciaid',
      label: 'Provincia',
      type: 'custom',
      render: (value, setValue, form, disabled) => (
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Provincia</label>
          <select
            className="w-full px-3 py-2 rounded-xl"
            style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            value={selProvincia}
            onChange={(e) => { setSelProvincia(e.target.value); }}
            disabled={disabled || !selDepartamento}
          >
            <option value="">Seleccione</option>
            {provincias.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
      )
    },
    {
      name: 'distritoid',
      label: 'Distrito',
      type: 'custom',
      render: (value, setValue, form, disabled) => (
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Distrito</label>
          <select
            className="w-full px-3 py-2 rounded-xl"
            style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            value={form?.distritoid || ''}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled || !selProvincia}
          >
            <option value="">Seleccione</option>
            {distritos.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
      )
    },
    { name: 'par_telefono1', label: 'Teléfono 1', type: 'text', placeholder: 'Teléfono principal' },
    { name: 'par_telefono2', label: 'Teléfono 2', type: 'text', placeholder: 'Teléfono alterno (opcional)' },
  ]), [departamentos, provincias, distritos, selDepartamento, selProvincia]);

  const validate = (v) => {
    if (!v.par_nombre) return 'Ingrese el nombre';
    if (!v.par_direccion) return 'Ingrese la dirección';
    if (!v.par_telefono1) return 'Ingrese el teléfono principal';
    if (!v.distritoid) return 'Seleccione el distrito';
    return '';
  };

  const handleSubmit = async (values) => {
    const payload = { ...values };
    if (payload.distritoid) payload.distritoid = Number(payload.distritoid);
    delete payload.departamentoid;
    delete payload.provinciaid;
    if (modalMode === 'add') return await createItem(payload);
    if (modalMode === 'edit') return await updateItem(current?.parroquiaid, payload);
    return { success: false, error: 'Modo no soportado' };
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    setConfirmOpen(false);
    setDeleteTarget(null);
    if (!id) return;
    const resp = await removeItem(id);
    if (!resp.success) alert(resp.error || 'Error al eliminar');
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando parroquias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Reintentar</button>
        </div>
      </div>
    );
  }

  const filtered = (items || []).filter(r => {
    const t = (searchTerm || '').toLowerCase();
    return (
      String(r.par_nombre || '').toLowerCase().includes(t) ||
      String(r.par_direccion || '').toLowerCase().includes(t) ||
      String(r.par_telefono1 || '').toLowerCase().includes(t) ||
      String(r.dep_nombre || '').toLowerCase().includes(t) ||
      String(r.prov_nombre || '').toLowerCase().includes(t) ||
      String(r.dis_nombre || '').toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Parroquias" subtitle="Administra las parroquias" icon={Church}>
        <button
          onClick={() => { setCurrent(null); setModalMode('add'); setIsModalOpen(true); }}
          className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
        >
          <Plus className="w-4 h-4" /> Nueva Parroquia
        </button>
      </PageHeader>

      <Card>
        <div className="px-4 mt-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, dirección o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl focus:ring-2 transition"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>
        </div>

        <div className="p-4">
          <TablaConPaginacion
            columns={columns}
            data={displayItems}
            rowKey={(r) => r.parroquiaid}
            searchTerm={searchTerm}
            searchKeys={['par_nombre', 'par_direccion', 'par_telefono1', 'dep_nombre', 'prov_nombre', 'dis_nombre']}
            itemsPerPage={7}
            hover
            striped
            emptyText="No hay parroquias"
          />
        </div>
      </Card>

      <ModalCrudGenerico
        isOpen={isModalOpen}
        mode={modalMode}
        title={modalMode === 'add' ? 'Nueva Parroquia' : (modalMode === 'edit' ? 'Editar Parroquia' : 'Información de la Parroquia')}
        icon={Church}
        initialValues={current || {}}
        fields={fields}
        validate={validate}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
        size="xl"
        readOnlyContent={(vals) => {
          const nombre = vals?.par_nombre || current?.par_nombre || '';
          const direccion = vals?.par_direccion || current?.par_direccion || '';
          const distrito = vals?.dis_nombre || current?.dis_nombre || '';
          const provincia = vals?.prov_nombre || current?.prov_nombre || '';
          const departamento = vals?.dep_nombre || current?.dep_nombre || '';
          const partes = [direccion, distrito, provincia, departamento, 'Perú'].filter(Boolean);
          const query = encodeURIComponent(partes.join(', '));
          const mapsSrc = `https://www.google.com/maps?q=${query}&z=16&output=embed`;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Info principal en dos columnas */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
                    <div className="text-gray-900 font-medium">{nombre || '-'}</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Dirección</label>
                    <div className="text-gray-900 font-medium">{direccion || '-'}</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Departamento</label>
                    <div className="text-gray-900 font-medium">{departamento || '-'}</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Provincia</label>
                    <div className="text-gray-900 font-medium">{provincia || '-'}</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Distrito</label>
                    <div className="text-gray-900 font-medium">{distrito || '-'}</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Teléfonos</label>
                    <div className="text-gray-900 font-medium">{(vals?.par_telefono1 || current?.par_telefono1 || '-') + ((vals?.par_telefono2 || current?.par_telefono2) ? ` / ${vals?.par_telefono2 || current?.par_telefono2}` : '')}</div>
                  </div>
                </div>
                {/* Mapa compacto en columna lateral */}
                <div className="bg-white p-3 border rounded-lg flex flex-col">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Ubicación</label>
                  {partes.length ? (
                    <div className="w-full mx-auto rounded overflow-hidden" style={{ height: 220 }}>
                      <iframe
                        title="Mapa de la Parroquia"
                        src={mapsSrc}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">Sin datos suficientes para mapa</div>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      <DialogoConfirmacion
        abierto={confirmOpen}
        titulo="Eliminar parroquia"
        mensaje="¿Estás seguro de eliminar esta parroquia? Esta acción no se puede deshacer."
        onConfirmar={confirmDelete}
        onCancelar={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ParroquiasPage;
