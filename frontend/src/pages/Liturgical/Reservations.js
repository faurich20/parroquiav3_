import React from 'react';
import { Calendar, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

import { useMemo, useState } from 'react';
import TablaBase from '../../components/Common/TablaBase';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import useLiturgicalReservations from '../../hooks/useLiturgicalReservations';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { buildActionColumn } from '../../components/Common/ActionColumn';

const Reservations = () => {
  const { items, loading, error, createItem, updateItem, removeItem } = useLiturgicalReservations({ autoList: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [current, setCurrent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const columns = useMemo(() => ([
    { key: 'act_id', header: 'Acto', width: '12%' },
    { key: 'personaid', header: 'Persona', width: '12%' },
    { key: 'reserved_date', header: 'Fecha', width: '12%', align: 'center' },
    { key: 'reserved_time', header: 'Hora', width: '10%', align: 'center' },
    { key: 'status', header: 'Estado', width: '14%' },
    { key: 'notes', header: 'Notas', width: '26%' },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setMode('edit'); setModalOpen(true); },
      onDelete: (row) => handleDelete(row),
      onView: undefined,
      width: '14%',
      align: 'right'
    })
  ]), []);

  const fields = useMemo(() => ([
    { name: 'act_id', label: 'Acto (ID)', type: 'text', placeholder: 'ID del acto (opcional)' },
    { name: 'personaid', label: 'Persona (ID)', type: 'text', placeholder: 'ID de persona' },
    { name: 'reserved_date', label: 'Fecha', type: 'date', placeholder: 'YYYY-MM-DD' },
    { name: 'reserved_time', label: 'Hora', type: 'time', placeholder: 'HH:MM' },
    { name: 'status', label: 'Estado', type: 'select', options: [
      { value: 'pendiente', label: 'Pendiente' },
      { value: 'confirmada', label: 'Confirmada' },
      { value: 'cancelada', label: 'Cancelada' },
    ] },
    { name: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Observaciones' },
  ]), []);

  const validate = (v) => {
    if (!v.personaid) return 'Ingrese el ID de la persona';
    if (!v.reserved_date) return 'Ingrese la fecha';
    return '';
  };

  const handleSubmit = async (values) => {
    if (mode === 'add') return await createItem(values);
    if (mode === 'edit') return await updateItem(current?.id, values);
    return { success: false, error: 'Modo no soportado' };
  };

  const handleDelete = async (row) => {
    setDeleteTarget(row.id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    setConfirmOpen(false);
    setDeleteTarget(null);
    if (!id) return;
    const r = await removeItem(id);
    if (!r.success) alert(r.error || 'Error al eliminar');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reservas de Actos Litúrgicos" subtitle="Gestiona las reservas y citas" icon={Calendar} />

      <Card>
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-sm text-gray-500">{loading ? 'Cargando...' : error ? `Error: ${error}` : `${items.length} registro(s)`}</div>
          <ActionButton icon={Plus} onClick={() => { setCurrent({ status: 'pendiente' }); setMode('add'); setModalOpen(true); }}>Nueva reserva</ActionButton>
        </div>
        <div className="px-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar por Acto, Persona, Estado o Notas..."
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
              String(r.act_id || '').toLowerCase().includes(term) ||
              String(r.personaid || '').toLowerCase().includes(term) ||
              String(r.status || '').toLowerCase().includes(term) ||
              String(r.notes || '').toLowerCase().includes(term)
            );
            return (
              <TablaBase columns={columns} data={filtered} rowKey={(r) => r.id} striped headerSticky />
            );
          })()}
        </div>
      </Card>

      <ModalCrudGenerico
        isOpen={modalOpen}
        mode={mode}
        title={mode === 'add' ? 'Nueva Reserva' : 'Editar Reserva'}
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

export default Reservations;