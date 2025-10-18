import React from 'react';
import { Church } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

import { useMemo, useState } from 'react';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import useLiturgicalActs from '../../hooks/useLiturgicalActs';
import { ACTO_NOMBRES } from '../../constants/liturgical';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { buildActionColumn } from '../../components/Common/ActionColumn';
import { useLocation } from 'react-router-dom';

const ActoLiturgico = () => {
  const { items, loading, error, list, createItem, updateItem, removeItem } = useLiturgicalActs({ autoList: true });
  const { authFetch } = useAuth();
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [current, setCurrent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [parroquiaOptions, setParroquiaOptions] = useState([]);

  // Datos de prueba para desarrollo (remover en producción)
  const testActos = [
    { id: 1, actoliturgicoid: 1, parroquia_nombre: 'Parroquia 1', act_nombre: 'misa', act_titulo: 'Misa Dominical', act_fecha: '2024-01-01', act_hora: '10:00', act_descripcion: 'Misa principal', act_estado: true },
    { id: 2, actoliturgicoid: 2, parroquia_nombre: 'Parroquia 2', act_nombre: 'bautismo', act_titulo: 'Bautismo Familiar', act_fecha: '2024-01-02', act_hora: '15:00', act_descripcion: 'Ceremonia de bautismo', act_estado: true },
    { id: 3, actoliturgicoid: 3, parroquia_nombre: 'Parroquia 1', act_nombre: 'matrimonio', act_titulo: 'Boda Especial', act_fecha: '2024-01-03', act_hora: '16:00', act_descripcion: 'Ceremonia matrimonial', act_estado: true },
    { id: 4, actoliturgicoid: 4, parroquia_nombre: 'Parroquia 3', act_nombre: 'confirmacion', act_titulo: 'Confirmación Juvenil', act_fecha: '2024-01-04', act_hora: '11:00', act_descripcion: 'Sacramento de confirmación', act_estado: true },
    { id: 5, actoliturgicoid: 5, parroquia_nombre: 'Parroquia 2', act_nombre: 'comunion', act_titulo: 'Primera Comunión', act_fecha: '2024-01-05', act_hora: '09:00', act_descripcion: 'Primera eucaristía', act_estado: true },
    { id: 6, actoliturgicoid: 6, parroquia_nombre: 'Parroquia 1', act_nombre: 'exequias', act_titulo: 'Funeral', act_fecha: '2024-01-06', act_hora: '14:00', act_descripcion: 'Ceremonia de exequias', act_estado: true },
    { id: 7, actoliturgicoid: 7, parroquia_nombre: 'Parroquia 3', act_nombre: 'misa', act_titulo: 'Misa Vespertina', act_fecha: '2024-01-07', act_hora: '18:00', act_descripcion: 'Misa de la tarde', act_estado: true },
    { id: 8, actoliturgicoid: 8, parroquia_nombre: 'Parroquia 2', act_nombre: 'bautismo', act_titulo: 'Bautismo Comunitario', act_fecha: '2024-01-08', act_hora: '10:30', act_descripcion: 'Bautismos múltiples', act_estado: true },
    { id: 9, actoliturgicoid: 9, parroquia_nombre: 'Parroquia 1', act_nombre: 'matrimonio', act_titulo: 'Boda Tradicional', act_fecha: '2024-01-09', act_hora: '17:00', act_descripcion: 'Ceremonia tradicional', act_estado: true },
    { id: 10, actoliturgicoid: 10, parroquia_nombre: 'Parroquia 3', act_nombre: 'confirmacion', act_titulo: 'Confirmación Parroquial', act_fecha: '2024-01-10', act_hora: '15:30', act_descripcion: 'Grupo de jóvenes', act_estado: true },
  ];

  // Usar datos reales si están disponibles, sino usar datos de prueba
  const displayItems = items.length > 0 ? items : testActos;

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/parroquias');
        if (resp?.ok) {
          const data = await resp.json();
          const opts = (data.parroquias || []).map(p => ({ value: p.parroquiaid, label: p.par_nombre }));
          setParroquiaOptions(opts);
        }
      } catch {}
    })();
  }, [authFetch]);

  // Detectar navegación desde el calendario y abrir automáticamente el modal
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('from') === 'calendar') {
      setCurrent({ act_estado: true });
      setModalMode('add');
      setModalOpen(true);

      // Limpiar el parámetro de la URL para evitar que se vuelva a abrir el modal al refrescar
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('from');
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search]);

  const labelByActo = useMemo(() => Object.fromEntries((ACTO_NOMBRES || []).map(a => [a.value, a.label])), []);
  const capitalize = (s) => (typeof s === 'string' && s.length > 0) ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const columns = useMemo(() => ([
    {
      key: 'acto', header: 'Acto', width: '30%', render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
            <span className="text-white text-sm font-bold">{(labelByActo[r.act_nombre] || 'A').charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{r.act_titulo}</p>
            <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{r.parroquia_nombre || ''}</p>
          </div>
        </div>
      )
    },
    {
      key: 'tipo', header: 'Tipo', width: '15%', align: 'center', render: (r) => (
        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">{labelByActo[r.act_nombre] || r.act_nombre}</span>
      )
    },
    {
      key: 'estado', header: 'Estado', width: '15%', align: 'center', render: (r) => (
        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${r.act_estado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {r.act_estado ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'descripcion', header: 'Descripción', width: '25%', render: (r) => (
        <span className="text-sm truncate" style={{ color: 'var(--text)' }}>
          {r.act_descripcion || 'Sin descripción'}
        </span>
      )
    },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setModalMode('edit'); setModalOpen(true); },
      onDelete: (row) => handleDelete(row),
      onView: (row) => { setCurrent(row); setModalMode('view'); setModalOpen(true); },
      width: '15%'
    })
  ]), []);

  const fields = useMemo(() => ([
    { name: 'parroquiaid', label: 'Parroquia', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...parroquiaOptions], disabled: false },
    { name: 'act_nombre', label: 'Acto', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...ACTO_NOMBRES] },
    { name: 'act_titulo', label: 'Título', type: 'text', placeholder: 'Ej. Misa dominical' },
    { name: 'act_descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Observaciones' },
    { name: 'act_estado', label: 'Activo', type: 'checkbox' },
  ]), [parroquiaOptions]);

  const validate = (v) => {
    if (!v.parroquiaid) return 'Seleccione la parroquia';
    if (!v.act_nombre) return 'Seleccione el acto';
    if (!v.act_titulo?.trim()) return 'Ingrese el título';
    return '';
  };

  const handleSubmit = async (values) => {
    // Asegurar tipos correctos
    const payload = { ...values };
    if (payload.parroquiaid !== '' && payload.parroquiaid !== undefined) payload.parroquiaid = Number(payload.parroquiaid);
    if (modalMode === 'add') return await createItem(payload);
    if (modalMode === 'edit') return await updateItem(current?.id, payload);
    return { success: false, error: 'Modo no soportado' };
  };

  const handleDelete = async (row) => {
    setDeleteTarget(row.id || row.actoliturgicoid);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    setConfirmOpen(false);
    setDeleteTarget(null);
    if (!id) return;
    const resp = await removeItem(id);
    if (!resp.success) alert(resp.error || 'Error al eliminar');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestionar Actos Litúrgicos"
        subtitle="Administra los actos litúrgicos de la parroquia"
        icon={Church}
      >
        <motion.button
          onClick={() => { setCurrent({ act_estado: true }); setModalMode('add'); setModalOpen(true); }}
          className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Acto
        </motion.button>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-sm text-gray-500">
            {loading && items.length === 0 ? 'Cargando...' : error ? `Error: ${error}` : `${items.length} registro(s)`}
          </div>
          <div />
        </div>

        <div className="px-4 mt-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar por Parroquia, Acto o Título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl focus:ring-2 transition"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>
        </div>

        <div className="p-4">
          {(() => {
            const term = (searchTerm || '').toLowerCase();
            const filtered = (items || []).filter(r =>
              String(r.parroquia_nombre || '').toLowerCase().includes(term) ||
              String(r.act_nombre || '').toLowerCase().includes(term) ||
              String(r.act_titulo || '').toLowerCase().includes(term)
            );
            return (
              <TablaConPaginacion
                columns={columns}
                data={displayItems}
                rowKey={(r) => r.id || r.actoliturgicoid}
                searchTerm={searchTerm}
                searchKeys={['parroquia_nombre', 'act_nombre', 'act_titulo']}
                itemsPerPage={7}
                striped
                headerSticky
                emptyText="No hay actos litúrgicos"
              />
            );
          })()}
        </div>
      </Card>

      <ModalCrudGenerico
        isOpen={modalOpen}
        mode={modalMode}
        title={modalMode === 'add' ? 'Nuevo Acto Litúrgico' : modalMode === 'edit' ? 'Editar Acto Litúrgico' : 'Detalle del Acto'}
        icon={Church}
        initialValues={current || { act_estado: true }}
        fields={fields}
        validate={validate}
        onSubmit={(vals) => {
          const payload = { ...vals };
          if (payload.parroquiaid !== '' && payload.parroquiaid !== undefined) payload.parroquiaid = Number(payload.parroquiaid);
          return handleSubmit(payload);
        }}
        onClose={() => setModalOpen(false)}
        size="xl"
      />

      <DialogoConfirmacion
        abierto={confirmOpen}
        titulo="Eliminar acto"
        mensaje="¿Estás seguro de eliminar este acto? Esta acción no se puede deshacer."
        onConfirmar={confirmDelete}
        onCancelar={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ActoLiturgico;
