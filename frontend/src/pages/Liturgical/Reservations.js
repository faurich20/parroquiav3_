import React from 'react';
import { Calendar } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

import { useMemo, useState } from 'react';
import TablaBase from '../../components/Common/TablaBase';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import useLiturgicalReservations from '../../hooks/useLiturgicalReservations';

const Reservations = () => {
  const { items, loading, error, createItem, updateItem, removeItem } = useLiturgicalReservations({ autoList: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [current, setCurrent] = useState(null);

  const columns = useMemo(() => ([
    { key: 'act_id', header: 'Acto', width: '12%' },
    { key: 'personaid', header: 'Persona', width: '12%' },
    { key: 'reserved_date', header: 'Fecha', width: '12%', align: 'center' },
    { key: 'reserved_time', header: 'Hora', width: '10%', align: 'center' },
    { key: 'status', header: 'Estado', width: '14%' },
    { key: 'notes', header: 'Notas', width: '26%' },
    { key: 'actions', header: 'Acciones', width: '14%', align: 'right', render: (row) => (
      <div className="flex justify-end gap-2">
        <ActionButton color="blue" icon={Pencil} onClick={() => { setCurrent(row); setMode('edit'); setModalOpen(true); }}>Editar</ActionButton>
        <ActionButton color="red" icon={Trash2} onClick={() => handleDelete(row)}>Eliminar</ActionButton>
      </div>
    )}
  ]), []);

  const fields = useMemo(() => ([
    { name: 'act_id', label: 'Acto (ID)', type: 'text', placeholder: 'ID del acto (opcional)' },
    { name: 'personaid', label: 'Persona (ID)', type: 'text', placeholder: 'ID de persona' },
    { name: 'reserved_date', label: 'Fecha', type: 'text', placeholder: 'YYYY-MM-DD' },
    { name: 'reserved_time', label: 'Hora', type: 'text', placeholder: 'HH:MM' },
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
    if (!window.confirm('¿Eliminar reserva?')) return;
    const r = await removeItem(row.id);
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
        <div className="p-4">
          <TablaBase columns={columns} data={items} rowKey={(r) => r.id} striped headerSticky />
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
    </div>
  );
};

export default Reservations;