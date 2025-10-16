import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaBase from '../../components/Common/TablaBase';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import useLiturgicalSchedules from '../../hooks/useLiturgicalSchedules';
import { LITURGICAL_TYPES } from '../../constants/liturgical';

const Schedules = () => {
  const { items, loading, error, createItem, updateItem, removeItem } = useLiturgicalSchedules({ autoList: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [current, setCurrent] = useState(null);

  const columns = useMemo(() => ([
    { key: 'type', header: 'Tipo', width: '20%' },
    { key: 'weekday', header: 'Día', width: '15%', render: (r) => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][r.weekday || 0] },
    { key: 'time', header: 'Hora', width: '15%', align: 'center' },
    { key: 'location', header: 'Lugar', width: '30%' },
    { key: 'actions', header: 'Acciones', width: '20%', align: 'right', render: (row) => (
      <div className="flex justify-end gap-2">
        <ActionButton color="blue" icon={Pencil} onClick={() => { setCurrent(row); setMode('edit'); setModalOpen(true); }}>Editar</ActionButton>
        <ActionButton color="red" icon={Trash2} onClick={() => handleDelete(row)}>Eliminar</ActionButton>
      </div>
    )}
  ]), []);

  const fields = useMemo(() => ([
    { name: 'type', label: 'Tipo', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...LITURGICAL_TYPES] },
    { name: 'weekday', label: 'Día de semana', type: 'select', options: [
      { value: 0, label: 'Domingo' },
      { value: 1, label: 'Lunes' },
      { value: 2, label: 'Martes' },
      { value: 3, label: 'Miércoles' },
      { value: 4, label: 'Jueves' },
      { value: 5, label: 'Viernes' },
      { value: 6, label: 'Sábado' },
    ] },
    { name: 'time', label: 'Hora', type: 'text', placeholder: 'HH:MM' },
    { name: 'location', label: 'Lugar', type: 'text', placeholder: 'Capilla/Parroquia' },
    { name: 'is_active', label: 'Activo', type: 'checkbox' },
  ]), []);

  const validate = (v) => {
    if (!v.type) return 'Seleccione el tipo';
    if (v.weekday === undefined || v.weekday === '') return 'Seleccione el día';
    if (!v.time) return 'Ingrese la hora';
    return '';
  };

  const handleSubmit = async (values) => {
    // Asegurar weekday como entero
    const payload = { ...values, weekday: Number(values.weekday) };
    if (mode === 'add') return await createItem(payload);
    if (mode === 'edit') return await updateItem(current?.id, payload);
    return { success: false, error: 'Modo no soportado' };
  };

  const handleDelete = async (row) => {
    if (!window.confirm('¿Eliminar horario?')) return;
    const r = await removeItem(row.id);
    if (!r.success) alert(r.error || 'Error al eliminar');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Horarios" subtitle="Gestiona los horarios de los actos litúrgicos" icon={Clock} />

      <Card>
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-sm text-gray-500">{loading ? 'Cargando...' : error ? `Error: ${error}` : `${items.length} registro(s)`}</div>
          <ActionButton icon={Plus} onClick={() => { setCurrent({ is_active: true }); setMode('add'); setModalOpen(true); }}>Nuevo horario</ActionButton>
        </div>
        <div className="p-4">
          <TablaBase columns={columns} data={items} rowKey={(r) => r.id} striped headerSticky />
        </div>
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
    </div>
  );
};

export default Schedules;