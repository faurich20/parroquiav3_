import React, { useEffect } from 'react';
import { Church } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

import { useMemo, useState } from 'react';
import TablaBase from '../../components/Common/TablaBase';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import useLiturgicalActs from '../../hooks/useLiturgicalActs';
import { ACTO_NOMBRES } from '../../constants/liturgical';
import { useAuth } from '../../contexts/AuthContext';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { motion } from 'framer-motion';

const ManageLiturgical = () => {
  const { items, loading, error, list, createItem, updateItem, removeItem } = useLiturgicalActs({ autoList: true });
  const { authFetch } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [current, setCurrent] = useState(null);
  const [parroquias, setParroquias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    // Cargar parroquias para el combobox
    (async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/parroquias');
        if (resp.ok) {
          const data = await resp.json();
          const opts = (data.parroquias || []).map(p => ({ value: p.parroquiaid, label: p.par_nombre }));
          setParroquias(opts);
        }
      } catch {}
    })();
  }, [authFetch]);

  const labelByActo = useMemo(() => Object.fromEntries((ACTO_NOMBRES || []).map(a => [a.value, a.label])), []);
  const capitalize = (s) => (typeof s === 'string' && s.length > 0) ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const columns = useMemo(() => ([
    {
      key: 'acto', header: 'Acto', width: '24%', render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
            <span className="text-white text-sm font-bold">{(labelByActo[r.act_nombre] || 'A').charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{capitalize(r.act_titulo)}</p>
            <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{r.parroquia_nombre || ''}</p>
          </div>
        </div>
      )
    },
    {
      key: 'tipo', header: 'Tipo', width: '10%', align: 'center', render: (r) => (
        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">{labelByActo[r.act_nombre] || capitalize(r.act_nombre)}</span>
      )
    },
    {
      key: 'fecha', header: 'Fecha/Hora', width: '16%', align: 'center', render: (r) => (
        <span>{r.act_fecha} {r.act_hora ? `/ ${r.act_hora}` : ''}</span>
      )
    },
    {
      key: 'estado', header: 'Estado', width: '10%', align: 'center', render: (r) => (
        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${r.act_estado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {r.act_estado ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'acciones', header: 'Acciones', width: '40%', align: 'center', render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <ActionButton color="theme" icon={Pencil} onClick={() => { setCurrent(row); setModalMode('edit'); setModalOpen(true); }}>Editar</ActionButton>
          <ActionButton color="red" icon={Trash2} onClick={() => handleDelete(row)}>Eliminar</ActionButton>
          <ActionButton color="blue" icon={Eye} onClick={() => { setCurrent(row); setModalMode('view'); setModalOpen(true); }}>Ver más</ActionButton>
        </div>
      )
    }
  ]), []);

  const fields = useMemo(() => ([
    { name: 'parroquiaid', label: 'Parroquia', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...parroquias] },
    { name: 'act_nombre', label: 'Acto', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...ACTO_NOMBRES] },
    { name: 'act_titulo', label: 'Título', type: 'text', placeholder: 'Ej. Misa dominical' },
    { name: 'act_fecha', label: 'Fecha', type: 'date', placeholder: 'YYYY-MM-DD' },
    { name: 'act_hora', label: 'Hora', type: 'time', placeholder: 'HH:MM' },
    { name: 'act_descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Observaciones' },
    { name: 'act_estado', label: 'Activo', type: 'checkbox' },
  ]), [parroquias]);

  const validate = (v) => {
    if (!v.parroquiaid) return 'Seleccione la parroquia';
    if (!v.act_nombre) return 'Seleccione el acto';
    if (!v.act_titulo) return 'Ingrese el título';
    if (!v.act_fecha) return 'Ingrese la fecha';
    if (!v.act_hora) return 'Ingrese la hora';
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
            {loading ? 'Cargando...' : error ? `Error: ${error}` : `${items.length} registro(s)`}
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
              <TablaBase
                columns={columns}
                data={filtered}
                rowKey={(r) => r.id || r.actoliturgicoid}
                striped
                headerSticky
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
        initialValues={current || {}}
        fields={fields}
        validate={validate}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        size="lg"
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

export default ManageLiturgical;