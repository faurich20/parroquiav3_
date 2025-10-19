import React, { useMemo, useState, useEffect } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';

const Reservacion = () => {
  const { items, loading, error, createItem, updateItem, removeItem } = useLiturgicalReservations({ autoList: true });
  const { authFetch } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [current, setCurrent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [horarios, setHorarios] = useState([]);

  // Cargar personas desde la API
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/personas');
        if (resp?.ok) {
          const data = await resp.json();
          setPersonas(data.personas || []);
        }
      } catch (err) {
        console.error('Error cargando personas:', err);
      }
    };
    loadPersonas();
  }, [authFetch]);

  // Cargar horarios desde la API
  useEffect(() => {
    const loadHorarios = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/liturgical/horarios');
        if (resp?.ok) {
          const data = await resp.json();
          setHorarios(data.items || []);
        }
      } catch (err) {
        console.error('Error cargando horarios:', err);
      }
    };
    loadHorarios();
  }, [authFetch]);

  // Usar solo datos reales de la API
  const displayItems = items || [];

  const columns = useMemo(() => ([
    {
      key: 'persona',
      header: 'Persona',
      width: '12%',
      render: (r) => (
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {r.persona_nombre || r.personaid || 'N/A'}
        </span>
      )
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      width: '20%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.res_descripcion || 'N/A'}
        </span>
      )
    },
    {
      key: 'fecha_hora',
      header: 'Fecha/Hora',
      width: '13%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.h_fecha && r.h_hora ? `${r.h_fecha} ${r.h_hora}` : 'N/A'}
        </span>
      )
    },
    {
      key: 'acto',
      header: 'Acto',
      width: '13%',
      render: (r) => (
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {r.acto_titulo || r.acto_nombre || 'N/A'}
        </span>
      )
    },
    {
      key: 'estado',
      header: 'Estado',
      width: '7%',
      render: (r) => {
        const estadoTexto = r.res_estado ? 'Cancelado' : 'Sin pagar';
        const bgColor = r.res_estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        return (
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
            {estadoTexto}
          </span>
        );
      }
    },
    buildActionColumn({
      onEdit: (row) => { setCurrent(row); setModalMode('edit'); setModalOpen(true); },
      onDelete: (row) => handleDelete(row),
      onView: (row) => { setCurrent(row); setModalMode('view'); setModalOpen(true); },
      width: '35%'
    })
  ]), []);

  // Preparar opciones de personas para el combobox
  const personasOptions = useMemo(() => 
    personas.map(p => ({
      value: p.personaid,
      label: `${p.per_nombres} ${p.per_apellidos}`.trim()
    })),
    [personas]
  );

  const fields = useMemo(() => {
    const baseFields = [
      { 
        name: 'h_fecha', 
        label: 'Fecha', 
        type: 'date', 
        placeholder: 'Seleccione la fecha',
        disabled: modalMode === 'view'
      },
      { 
        name: 'horarioid', 
        label: 'Horario', 
        type: 'select', 
        options: [{ value: '', label: 'Seleccione un horario' }],
        disabled: modalMode === 'view',
        dependsOn: 'h_fecha', // Indica que depende del campo h_fecha
        optionsFilter: (fecha) => {
          if (!fecha) return [];
          // Filtrar horarios por la fecha seleccionada
          const filtrados = horarios.filter(h => h.h_fecha === fecha);
          return filtrados.map(h => ({
            value: h.horarioid,
            label: `${h.h_hora} - ${h.acto_titulo || h.acto_nombre || h.act_titulo || h.act_nombre}`
          }));
        }
      },
      { 
        name: 'persona_nombre', 
        label: 'Persona', 
        type: 'combobox', 
        options: personasOptions,
        placeholder: 'Seleccione o escriba el nombre',
        disabled: modalMode === 'view',
        editable: true
      },
      { name: 'res_descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Descripción de la reserva' },
      { name: 'res_estado', label: 'Estado', type: 'select', options: [
        { value: false, label: 'Sin pagar' },
        { value: true, label: 'Cancelado' },
      ] },
    ];

    return baseFields;
  }, [modalMode, personasOptions, horarios]);

  const validate = (v) => {
    if (!v.horarioid) return 'Ingrese el ID del horario';
    if (!v.res_descripcion?.trim()) return 'Ingrese la descripción';
    return '';
  };

  const handleSubmit = async (values) => {
    if (modalMode === 'add') return await createItem(values);
    if (modalMode === 'edit') return await updateItem(current?.reservaid || current?.id, values);
    return { success: false, error: 'Modo no soportado' };
  };

  const handleDelete = async (row) => {
    setDeleteTarget(row.reservaid || row.id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    setConfirmOpen(false);
    setDeleteTarget(null);
    if (!id) return;
    const r = await removeItem(id);
    if (!r.success) {
      alert(r.error || 'Error al eliminar');
    }
    // La lista se actualiza automáticamente por el hook
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas de Actos Litúrgicos"
        subtitle="Gestiona las reservas y citas"
        icon={Calendar}
      >
        <motion.button
          onClick={() => { setCurrent({ status: 'pendiente' }); setModalMode('add'); setModalOpen(true); }}
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
        {(() => {
          const term = (searchTerm || '').toLowerCase();
          const filtered = (displayItems || []).filter(r =>
            String(r.acto_titulo || r.acto_nombre || '').toLowerCase().includes(term) ||
            String(r.persona_nombre || '').toLowerCase().includes(term) ||
            String(r.res_descripcion || '').toLowerCase().includes(term) ||
            String(r.estado_texto || '').toLowerCase().includes(term)
          );
          return (
            <TablaConPaginacion
              columns={columns}
              data={filtered}
              rowKey={(r) => r.id || r.reservaid}
              searchTerm={searchTerm}
              searchKeys={['acto_titulo', 'acto_nombre', 'persona_nombre', 'res_descripcion', 'estado_texto']}
              itemsPerPage={7}
              striped
              headerSticky
              emptyText="No hay reservas"
            />
          );
        })()}
      </Card>

      <ModalCrudGenerico
        isOpen={modalOpen}
        mode={modalMode}
        title={modalMode === 'add' ? 'Nueva Reserva' : modalMode === 'edit' ? 'Editar Reserva' : 'Detalle de Reserva'}
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
