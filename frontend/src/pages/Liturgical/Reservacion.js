import React, { useMemo, useState } from 'react';
import { Calendar, Search, Pencil, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import useLiturgicalReservations from '../../hooks/useLiturgicalReservations';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { buildActionColumn } from '../../components/Common/ActionColumn';

const Reservacion = () => {
  const { items, loading, error, createItem, updateItem, removeItem } = useLiturgicalReservations({ autoList: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [current, setCurrent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Datos de prueba para desarrollo (remover en producción)
  const testReservas = [
    { id: 1, act_id: 1, personaid: 1, reserved_date: '2024-01-01', reserved_time: '10:00', status: 'pendiente', notes: 'Primera reserva' },
    { id: 2, act_id: 2, personaid: 2, reserved_date: '2024-01-02', reserved_time: '15:00', status: 'confirmada', notes: 'Reserva confirmada' },
    { id: 3, act_id: 3, personaid: 3, reserved_date: '2024-01-03', reserved_time: '16:00', status: 'pendiente', notes: 'Esperando confirmación' },
    { id: 4, act_id: 4, personaid: 4, reserved_date: '2024-01-04', reserved_time: '11:00', status: 'cancelada', notes: 'Cancelada por usuario' },
    { id: 5, act_id: 5, personaid: 5, reserved_date: '2024-01-05', reserved_time: '09:00', status: 'confirmada', notes: 'Confirmada' },
    { id: 6, act_id: 6, personaid: 6, reserved_date: '2024-01-06', reserved_time: '14:00', status: 'pendiente', notes: 'Nueva reserva' },
    { id: 7, act_id: 7, personaid: 7, reserved_date: '2024-01-07', reserved_time: '18:00', status: 'confirmada', notes: 'Confirmada por email' },
    { id: 8, act_id: 8, personaid: 8, reserved_date: '2024-01-08', reserved_time: '10:30', status: 'pendiente', notes: 'Esperando pago' },
    { id: 9, act_id: 9, personaid: 9, reserved_date: '2024-01-09', reserved_time: '17:00', status: 'confirmada', notes: 'Todo listo' },
    { id: 10, act_id: 10, personaid: 10, reserved_date: '2024-01-10', reserved_time: '15:30', status: 'cancelada', notes: 'Cancelada' },
  ];

  // Usar datos reales si están disponibles, sino usar datos de prueba
  const displayItems = items.length > 0 ? items : testReservas;

  const columns = useMemo(() => ([
    {
      key: 'horarioid',
      header: 'Horario',
      width: '12%',
      render: (r) => (
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {r.horarioid || 'N/A'}
        </span>
      )
    },
    {
      key: 'persona',
      header: 'Persona',
      width: '15%',
      render: (r) => (
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {r.persona_nombre || r.personaid || 'N/A'}
        </span>
      )
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      width: '25%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.res_descripcion || 'N/A'}
        </span>
      )
    },
    {
      key: 'fecha_hora',
      header: 'Fecha/Hora',
      width: '15%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.h_fecha && r.h_hora ? `${r.h_fecha} ${r.h_hora}` : 'N/A'}
        </span>
      )
    },
    {
      key: 'acto',
      header: 'Acto',
      width: '15%',
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
        const estadoTexto = r.res_estado ? 'Cancelado' : 'Sin pagar';
        const bgColor = r.res_estado ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
        return (
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
            {estadoTexto}
          </span>
        );
      }
    },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setMode('edit'); setModalOpen(true); },
      onDelete: (row) => handleDelete(row),
      onView: undefined,
      width: '8%',
      align: 'right'
    })
  ]), []);

  const fields = useMemo(() => ([
    { name: 'horarioid', label: 'Horario (ID)', type: 'text', placeholder: 'ID del horario' },
    { name: 'personaid', label: 'Persona (ID)', type: 'text', placeholder: 'ID de persona (opcional)' },
    { name: 'res_descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Descripción de la reserva' },
    { name: 'res_estado', label: 'Estado', type: 'select', options: [
      { value: false, label: 'Sin pagar' },
      { value: true, label: 'Cancelado' },
    ] },
  ]), []);

  const validate = (v) => {
    if (!v.horarioid) return 'Ingrese el ID del horario';
    if (!v.res_descripcion?.trim()) return 'Ingrese la descripción';
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
      <PageHeader
        title="Reservas de Actos Litúrgicos"
        subtitle="Gestiona las reservas y citas"
        icon={Calendar}
      >
        <motion.button
          onClick={() => { setCurrent({ status: 'pendiente' }); setMode('add'); setModalOpen(true); }}
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
        <TablaConPaginacion
          columns={columns}
          data={displayItems}
          rowKey={(r) => r.id}
          searchTerm={searchTerm}
          searchKeys={['act_id', 'personaid', 'status', 'notes']}
          itemsPerPage={7}
          striped
          headerSticky
          emptyText="No hay reservas"
        />
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

export default Reservacion;
