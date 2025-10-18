import React, { useMemo, useState } from 'react';
import { Calendar, Search, Plus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import useLiturgicalSchedules from '../../hooks/useLiturgicalSchedules';
import useLiturgicalActs from '../../hooks/useLiturgicalActs';
import useParroquias from '../../hooks/useParroquias';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { buildActionColumn } from '../../components/Common/ActionColumn';

const GestionHorarios = () => {
  const { items: horarios, loading: loadingHorarios, error: errorHorarios, createItem, updateItem, removeItem } = useLiturgicalSchedules({ autoList: true });
  const { items: actos } = useLiturgicalActs({ autoList: true });
  const { items: parroquias } = useParroquias({ autoList: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [current, setCurrent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Datos de prueba para desarrollo (remover en producción)
  const testHorarios = [
    { id: 1, horarioid: 1, actoliturgicoid: 1, acto_nombre: 'misa', acto_titulo: 'Misa Dominical', h_fecha: '2024-01-01', h_hora: '10:00', parroquiaid: 1, parroquia_nombre: 'Parroquia 1' },
    { id: 2, horarioid: 2, actoliturgicoid: 2, acto_nombre: 'bautismo', acto_titulo: 'Bautismo Comunitario', h_fecha: '2024-01-02', h_hora: '15:00', parroquiaid: 1, parroquia_nombre: 'Parroquia 1' },
    { id: 3, horarioid: 3, actoliturgicoid: 3, acto_nombre: 'matrimonio', acto_titulo: 'Ceremonia Matrimonial', h_fecha: '2024-01-03', h_hora: '16:00', parroquiaid: 1, parroquia_nombre: 'Parroquia 1' },
  ];

  // Usar datos reales si están disponibles, sino usar datos de prueba
  const displayItems = horarios.length > 0 ? horarios : testHorarios;

  const actoOptions = useMemo(() => {
    const actosDisponibles = actos.filter(acto => acto.act_estado);
    return actosDisponibles.map(acto => ({
      value: acto.actoliturgicoid,
      label: `${acto.act_titulo} (${acto.parroquia_nombre})`
    }));
  }, [actos]);

  const parroquiaOptions = useMemo(() => {
    return parroquias.map(parroquia => ({
      value: parroquia.parroquiaid,
      label: parroquia.par_nombre
    }));
  }, [parroquias]);

  const columns = useMemo(() => ([
    {
      key: 'acto',
      header: 'Acto Litúrgico',
      width: '25%',
      render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
            <span className="text-white text-sm font-bold">{(r.acto_nombre || 'A').charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{r.acto_titulo}</p>
            <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{r.parroquia_nombre}</p>
          </div>
        </div>
      )
    },
    {
      key: 'fecha_hora',
      header: 'Fecha y Hora',
      width: '20%',
      render: (r) => (
        <div className="text-center">
          <p className="font-medium" style={{ color: 'var(--text)' }}>{r.h_fecha}</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{r.h_hora}</p>
        </div>
      )
    },
    {
      key: 'parroquia',
      header: 'Parroquia',
      width: '20%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.parroquia_nombre || 'N/A'}
        </span>
      )
    },
    {
      key: 'reservas',
      header: 'Reservas',
      width: '15%',
      align: 'center',
      render: (r) => (
        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
          0 reservas
        </span>
      )
    },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setMode('edit'); setModalOpen(true); },
      onDelete: (row) => handleDelete(row),
      onView: undefined,
      width: '20%',
      align: 'right'
    })
  ]), []);

  const fields = useMemo(() => ([
    { name: 'actoliturgicoid', label: 'Acto Litúrgico', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...actoOptions] },
    { name: 'h_fecha', label: 'Fecha', type: 'date', placeholder: 'YYYY-MM-DD' },
    { name: 'h_hora', label: 'Hora', type: 'time', placeholder: 'HH:MM' },
    { name: 'parroquiaid', label: 'Parroquia', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...parroquiaOptions] },
  ]), [actoOptions, parroquiaOptions]);

  const validate = (v) => {
    if (!v.actoliturgicoid) return 'Seleccione el acto litúrgico';
    if (!v.h_fecha) return 'Ingrese la fecha';
    if (!v.h_hora) return 'Ingrese la hora';
    if (!v.parroquiaid) return 'Seleccione la parroquia';
    return '';
  };

  const handleSubmit = async (values) => {
    const payload = { ...values };
    if (payload.actoliturgicoid !== '' && payload.actoliturgicoid !== undefined) payload.actoliturgicoid = Number(payload.actoliturgicoid);
    if (payload.parroquiaid !== '' && payload.parroquiaid !== undefined) payload.parroquiaid = Number(payload.parroquiaid);

    if (mode === 'add') return await createItem(payload);
    if (mode === 'edit') return await updateItem(current?.id, payload);
    return { success: false, error: 'Modo no soportado' };
  };

  const handleDelete = async (row) => {
    setDeleteTarget(row.id || row.horarioid);
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
        title="Gestionar Horarios"
        subtitle="Programa horarios específicos para actos litúrgicos"
        icon={Calendar}
      >
        <motion.button
          onClick={() => { setCurrent({}); setMode('add'); setModalOpen(true); }}
          className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Horario
        </motion.button>
      </PageHeader>

      <Card>
        {/* Buscador */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar por Acto, Fecha, Hora o Parroquia..."
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
          rowKey={(r) => r.id || r.horarioid}
          searchTerm={searchTerm}
          searchKeys={['acto_titulo', 'acto_nombre', 'h_fecha', 'h_hora', 'parroquia_nombre']}
          itemsPerPage={7}
          striped
          headerSticky
          emptyText="No hay horarios programados"
        />
      </Card>

      <ModalCrudGenerico
        isOpen={modalOpen}
        mode={mode}
        title={mode === 'add' ? 'Nuevo Horario' : 'Editar Horario'}
        icon={Clock}
        initialValues={current || {}}
        fields={fields}
        validate={validate}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        size="lg"
      />

      <DialogoConfirmacion
        abierto={confirmOpen}
        titulo="Eliminar horario"
        mensaje="¿Estás seguro de eliminar este horario? Esto también eliminará todas las reservas asociadas."
        onConfirmar={confirmDelete}
        onCancelar={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default GestionHorarios;
