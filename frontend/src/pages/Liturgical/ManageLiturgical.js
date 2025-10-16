import React from 'react';
import { Church } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

import { useMemo, useState } from 'react';
import TablaBase from '../../components/Common/TablaBase';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import useLiturgicalActs from '../../hooks/useLiturgicalActs';
import { LITURGICAL_TYPES } from '../../constants/liturgical';

const ManageLiturgical = () => {
  const { items, loading, error, list, createItem, updateItem, removeItem } = useLiturgicalActs({ autoList: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [current, setCurrent] = useState(null);

  const columns = useMemo(() => ([
    { key: 'type', header: 'Tipo', width: '14%' },
    { key: 'title', header: 'Título', width: '26%' },
    { key: 'date', header: 'Fecha', width: '14%', align: 'center' },
    { key: 'time', header: 'Hora', width: '10%', align: 'center' },
    { key: 'location', header: 'Lugar', width: '20%' },
    {
      key: 'actions',
      header: 'Acciones',
      width: '16%',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <ActionButton color="gray" icon={Eye} onClick={() => { setCurrent(row); setModalMode('view'); setModalOpen(true); }}>Ver</ActionButton>
          <ActionButton color="blue" icon={Pencil} onClick={() => { setCurrent(row); setModalMode('edit'); setModalOpen(true); }}>Editar</ActionButton>
          <ActionButton color="red" icon={Trash2} onClick={() => handleDelete(row)}>Eliminar</ActionButton>
        </div>
      )
    }
  ]), []);

  const fields = useMemo(() => ([
    { name: 'type', label: 'Tipo de Acto', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...LITURGICAL_TYPES] },
    { name: 'title', label: 'Título', type: 'text', placeholder: 'Ej. Misa dominical' },
    { name: 'date', label: 'Fecha', type: 'text', placeholder: 'YYYY-MM-DD' },
    { name: 'time', label: 'Hora', type: 'text', placeholder: 'HH:MM' },
    { name: 'location', label: 'Lugar', type: 'text', placeholder: 'Capilla/Parroquia' },
    { name: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Observaciones' },
    { name: 'is_active', label: 'Activo', type: 'checkbox' },
  ]), []);

  const validate = (v) => {
    if (!v.type) return 'Seleccione el tipo de acto';
    if (!v.title) return 'Ingrese el título';
    if (!v.date) return 'Ingrese la fecha';
    if (!v.time) return 'Ingrese la hora';
    return '';
  };

  const handleSubmit = async (values) => {
    if (modalMode === 'add') return await createItem(values);
    if (modalMode === 'edit') return await updateItem(current?.id, values);
    return { success: false, error: 'Modo no soportado' };
  };

  const handleDelete = async (row) => {
    // Confirmación simple por ahora; se puede reemplazar por DialogoConfirmacion
    if (!window.confirm('¿Eliminar este acto?')) return;
    const resp = await removeItem(row.id);
    if (!resp.success) alert(resp.error || 'Error al eliminar');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestionar Actos Litúrgicos"
        subtitle="Administra los actos litúrgicos de la parroquia"
        icon={Church}
      />

      <Card>
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-sm text-gray-500">
            {loading ? 'Cargando...' : error ? `Error: ${error}` : `${items.length} registro(s)`}
          </div>
          <ActionButton icon={Plus} onClick={() => { setCurrent({ is_active: true }); setModalMode('add'); setModalOpen(true); }}>
            Nuevo acto
          </ActionButton>
        </div>

        <div className="p-4">
          <TablaBase
            columns={columns}
            data={items}
            rowKey={(r) => r.id}
            striped
            headerSticky
          />
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
    </div>
  );
};

export default ManageLiturgical;