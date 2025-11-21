import React, { useEffect, useMemo, useState } from 'react';
import { Church, Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ActionButton from '../../components/Common/ActionButton';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import useLiturgicalActs from '../../hooks/useLiturgicalActs';
import { ACTO_NOMBRES } from '../../constants/liturgical';
import { useAuth } from '../../contexts/AuthContext';
import { buildActionColumn } from '../../components/Common/ActionColumn';

const deriveEndDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) {
    return { date: dateStr, time: timeStr };
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  if ([year, month, day, hours, minutes].some((n) => Number.isNaN(n))) {
    return { date: dateStr, time: timeStr };
  }

  const base = new Date(year, month - 1, day, hours, minutes, 0);
  if (Number.isNaN(base.getTime())) {
    return { date: dateStr, time: timeStr };
  }

  base.setHours(base.getHours() + 1);
  const pad = (n) => n.toString().padStart(2, '0');
  return {
    date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    time: `${pad(base.getHours())}:${pad(base.getMinutes())}`
  };
};

const ActoLiturgico = () => {
  const { items, loading, error, list, createItem, updateItem, removeItem } = useLiturgicalActs({ autoList: true });
  useEffect(() => {
    console.log('[ActoLiturgico] items recibidos:', items);
  }, [items]);
  const { authFetch, hasPermission, user, reloadProfile } = useAuth();
  const location = useLocation();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [current, setCurrent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [parroquiaOptions, setParroquiaOptions] = useState([]);

  // Cargar parroquias para el combo
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/parroquias');
        if (resp?.ok) {
          const data = await resp.json();
          if (!mounted) return;
          const opts = (data.parroquias || []).map(p => ({ value: p.parroquiaid, label: p.par_nombre }));
          setParroquiaOptions(opts);
        }
      } catch {
        // silencioso
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authFetch]);

  // Detectar navegación desde el calendario y abrir automáticamente el modal "Nuevo Acto"
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('from') === 'calendar') {
      // Aquí podrías, si quieres, leer otros params (fecha, parroquia, etc.) y pasarlos a openActoModal
      openActoModal();

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('from');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [location.search]);


  // Asegurar que el perfil tenga persona/parroquia cargada
  useEffect(() => {
    if (user && !user.persona && typeof reloadProfile === 'function') {
      reloadProfile();
    }
  }, [user, reloadProfile]);

  const labelByActo = useMemo(
    () => Object.fromEntries((ACTO_NOMBRES || []).map(a => [a.value, a.label])),
    []
  );

  const normalizedRole = (user?.role || '').toString().toLowerCase();
  const isAdmin = normalizedRole === 'administrador' || normalizedRole === 'admin';
  const userParroquiaId = user?.persona?.parroquiaid || null;

  const columns = useMemo(() => {
    const canEdit = hasPermission('liturgico_actos_editar');
    const canDelete = hasPermission('liturgico_actos_eliminar');
    const canViewDetail = hasPermission('liturgico_actos_ver');

    return [
      {
        key: 'acto',
        header: 'Acto Litúrgico',
        width: '20%',
        render: (r) => (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
            >
              <span className="text-white text-sm font-bold">
                {(labelByActo[r.act_nombre] || 'A').charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate" style={{ color: 'var(--text)' }}>
                {r.act_titulo}
              </p>
              <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                {r.parroquia_nombre || ''}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'tipo',
        header: 'Tipo',
        width: '12%',
        align: 'center',
        render: (r) => (
          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            {labelByActo[r.act_nombre] || r.act_nombre}
          </span>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        width: '10%',
        align: 'center',
        render: (r) => (
          <span
            className={`px-2 py-0.5 rounded-lg text-xs font-medium ${r.act_estado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
          >
            {r.act_estado ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        key: 'descripcion',
        header: 'Descripción',
        width: '28%',
        render: (r) => (
          <span className="text-sm truncate" style={{ color: 'var(--text)' }}>
            {r.act_descripcion || 'Sin descripción'}
          </span>
        ),
      },
      buildActionColumn({
        onEdit: canEdit
          ? (row) => {
            setCurrent(row);
            setModalMode('edit');
            setModalOpen(true);
          }
          : null,
        onDelete: canDelete ? (row) => handleDelete(row) : null,
        onView: canViewDetail
          ? (row) => {
            console.log('[ActoLiturgico] Ver más row:', row);
            setCurrent(row);
            setModalMode('view');
            setModalOpen(true);
          }
          : null,
        width: '30%',
      }),
    ];
  }, [hasPermission, labelByActo]);

  // Campos del formulario del modal
  const fields = useMemo(() => {
    let parroquiaFieldOptions = [{ value: '', label: 'Seleccione' }, ...parroquiaOptions];
    let parroquiaDisabled = false;
    let parroquiaGetInitial = null;

    if (!isAdmin && userParroquiaId) {
      const ownOpt = parroquiaOptions.find(o => o.value === userParroquiaId);
      parroquiaFieldOptions = ownOpt ? [ownOpt] : [];
      parroquiaDisabled = true;
      parroquiaGetInitial = () => userParroquiaId;
    }

    const baseFields = [
      {
        name: 'parroquiaid',
        label: 'Parroquia',
        type: 'select',
        options: parroquiaFieldOptions,
        disabled: parroquiaDisabled,
        ...(parroquiaGetInitial ? { getInitialValue: parroquiaGetInitial } : {}),
      },
      {
        name: 'act_nombre',
        label: 'Acto Litúrgico',
        type: 'select',
        options: [{ value: '', label: 'Seleccione' }, ...ACTO_NOMBRES],
      },
      {
        name: 'act_titulo',
        label: 'Título',
        type: 'text',
        placeholder: 'Ej. Misa dominical',
      },
      {
        name: 'act_descripcion',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Observaciones',
      },
      { name: 'h_fecha', label: 'Fecha inicial', type: 'date', placeholder: 'YYYY-MM-DD' },
      { name: 'h_hora', label: 'Hora inicial', type: 'time', placeholder: 'HH:MM' },
      { name: 'h_fecha_fin', label: 'Fecha final', type: 'date', placeholder: 'YYYY-MM-DD' },
      { name: 'h_hora_fin', label: 'Hora final', type: 'time', placeholder: 'HH:MM' },
    ];

    if (modalMode === 'edit') {
      baseFields.push({ name: 'act_estado', label: 'Activo', type: 'checkbox' });
    }

    return baseFields;
  }, [parroquiaOptions, modalMode, isAdmin, userParroquiaId]);

  const validate = (v) => {
    if (!v.parroquiaid) return 'Seleccione la parroquia';
    if (!v.act_nombre) return 'Seleccione el acto';
    if (!v.act_titulo || !v.act_titulo.trim()) return 'Ingrese el título';
    if (!v.h_fecha) return 'Ingrese la fecha inicial';
    if (!v.h_hora) return 'Ingrese la hora inicial';
    const defaults = deriveEndDateTime(v.h_fecha, v.h_hora);
    const fechaFin = v.h_fecha_fin || defaults.date;
    const horaFin = v.h_hora_fin || defaults.time;

    try {
      const inicio = new Date(`${v.h_fecha}T${v.h_hora}:00`);
      const fin = new Date(`${fechaFin}T${horaFin}:00`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
        return 'Fechas u horas inválidas';
      }
      if (fin < inicio) {
        return 'La fecha/hora final debe ser mayor o igual a la inicial';
      }
    } catch {
      return 'Fechas u horas inválidas';
    }

    return '';
  };



  const handleSubmit = async (values) => {
    try {
      const payload = { ...values };
      const defaults = deriveEndDateTime(payload.h_fecha, payload.h_hora);
      payload.h_fecha_fin = payload.h_fecha_fin || defaults.date;
      payload.h_hora_fin = payload.h_hora_fin || defaults.time;

      if (payload.parroquiaid !== '' && payload.parroquiaid !== undefined) {
        payload.parroquiaid = Number(payload.parroquiaid);
      }

      if (modalMode === 'add') {
        payload.act_estado = true;
      }

      const response = await fetch('http://localhost:5000/api/liturgical/actos-con-horario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        list && list();
        return { success: true, message: data.message };
      }

      throw new Error(data.error || 'Error desconocido');
    } catch (error) {
      console.error('Error creando acto con horario:', error);
      return { success: false, error: error.message };
    }
  };

  const handleDelete = (row) => {
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
      list && list();
    } else {
      alert(resp.error || 'Error al eliminar');
    }
  };

  const filteredItems = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    const base = (items || []).filter(r => {
      if (!isAdmin && userParroquiaId && r.parroquiaid && r.parroquiaid !== userParroquiaId) {
        return false;
      }
      return (
        String(r.parroquia_nombre || '').toLowerCase().includes(term) ||
        String(r.act_nombre || '').toLowerCase().includes(term) ||
        String(r.act_titulo || '').toLowerCase().includes(term)
      );
    });
    return base;
  }, [items, searchTerm, isAdmin, userParroquiaId]);

  if (loading && (!items || items.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="text-gray-600">Cargando actos litúrgicos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestionar Actos Litúrgicos"
        subtitle="Administra los actos litúrgicos de la parroquia"
        icon={Church}
      >
        {hasPermission('liturgico_actos_crear') && (
          <motion.button
            onClick={() => {
              setCurrent({ act_estado: true });
              setModalMode('add');
              setModalOpen(true);
            }}
            className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Acto
          </motion.button>
        )}
      </PageHeader>

      <Card>
        {/* Buscador */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--muted)' }}
            />
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

        <TablaConPaginacion
          columns={columns}
          data={filteredItems}
          rowKey={(r) => r.id || r.actoliturgicoid}
          searchTerm={searchTerm}
          searchKeys={['parroquia_nombre', 'act_nombre', 'act_titulo']}
          itemsPerPage={7}
          striped
          headerSticky
          emptyText="No hay actos litúrgicos"
        />
      </Card>

      <ModalCrudGenerico
        isOpen={modalOpen}
        mode={modalMode}
        title={
          modalMode === 'add'
            ? 'Nuevo Acto Litúrgico'
            : modalMode === 'edit'
              ? 'Editar Acto Litúrgico'
              : 'Detalle del Acto'
        }
        icon={Church}
        initialValues={current || { act_estado: true }}
        fields={fields}
        validate={validate}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        size="xl"
      />

      <DialogoConfirmacion
        abierto={confirmOpen}
        titulo="Eliminar acto"
        mensaje="¿Estás seguro de eliminar este acto? Esta acción no se puede deshacer."
        onConfirmar={confirmDelete}
        onCancelar={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ActoLiturgico;

