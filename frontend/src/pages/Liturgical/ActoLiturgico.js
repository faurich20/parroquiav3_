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
      key: 'acto', header: 'Acto Litúrgico', width: '20%', render: (r) => (
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
      key: 'tipo', header: 'Tipo', width: '12%', align: 'center', render: (r) => (
        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">{labelByActo[r.act_nombre] || r.act_nombre}</span>
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
      key: 'descripcion', header: 'Descripción', width: '28%', render: (r) => (
        <span className="text-sm truncate" style={{ color: 'var(--text)' }}>
          {r.act_descripcion || 'Sin descripción'}
        </span>
      )
    },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setModalMode('edit'); setModalOpen(true); },
      onDelete: (row) => handleDelete(row),
      onView: (row) => { setCurrent(row); setModalMode('view'); setModalOpen(true); },
      width: '30%'
    })
  ]), []);

  const fields = useMemo(() => {
    const baseFields = [
      { name: 'parroquiaid', label: 'Parroquia', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...parroquiaOptions], disabled: false },
      { name: 'act_nombre', label: 'Acto Litúrgico', type: 'select', options: [{ value: '', label: 'Seleccione' }, ...ACTO_NOMBRES] },
      { name: 'act_titulo', label: 'Título', type: 'text', placeholder: 'Ej. Misa dominical' },
      { name: 'act_descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Observaciones' },
      { name: 'h_fecha', label: 'Fecha', type: 'date', placeholder: 'YYYY-MM-DD' },
      { name: 'h_hora', label: 'Hora', type: 'time', placeholder: 'HH:MM' },
    ];

    // Solo agregar el campo de estado en modo edición
    if (modalMode === 'edit') {
      baseFields.push({ name: 'act_estado', label: 'Activo', type: 'checkbox' });
    }

    return baseFields;
  }, [parroquiaOptions, modalMode]);

  const validate = (v) => {
    if (!v.parroquiaid) return 'Seleccione la parroquia';
    if (!v.act_nombre) return 'Seleccione el acto';
    if (!v.act_titulo?.trim()) return 'Ingrese el título';
    if (!v.h_fecha) return 'Ingrese la fecha';
    if (!v.h_hora) return 'Ingrese la hora';
    // No validar act_estado para nuevos actos ya que por defecto es true
    return '';
  };

  const handleSubmit = async (values) => {
    try {
      const payload = { ...values };
      if (payload.parroquiaid !== '' && payload.parroquiaid !== undefined) payload.parroquiaid = Number(payload.parroquiaid);

      // Si es un nuevo acto, establecer estado como activo por defecto
      if (modalMode === 'add') {
        payload.act_estado = true;
      }

      // Usar la nueva ruta que crea acto y horario juntos
      const response = await fetch('http://localhost:5000/api/liturgical/actos-con-horario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Recargar datos después de crear
        list && list();
        return { success: true, message: data.message };
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error creando acto con horario:', error);
      return { success: false, error: error.message };
    }
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
    if (resp.success) {
      // Actualizar la lista local después de eliminar exitosamente
      list && list();
    } else {
      alert(resp.error || 'Error al eliminar');
    }
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
        {/* Buscador */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
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

        {/* Tabla */}
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
              data={filtered}
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
          return handleSubmit(vals);
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
