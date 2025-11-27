import React, { useEffect, useMemo, useState } from 'react';
import { Church, Plus, Minus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ActionButton from '../../components/Common/ActionButton';
import ModalActoLiturgico from '../../components/Modals/ModalActoLiturgico';
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
  const [current, setCurrent] = useState(null);
  const [viewMode, setViewMode] = useState(false); // Nuevo estado
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
      setCurrent(null);
      setModalOpen(true);

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

  const userRole = user?.role || ''; // role es un string, no un objeto
  const isAdmin = userRole === 'Administrador'; // Rol exacto
  const userParroquiaId = user?.persona?.parroquiaid || null;

  const handleUpdateMaxReservas = React.useCallback(async (row, increment) => {
    const currentVal = row.act_max_reservas || 0;
    const newVal = Math.max(0, currentVal + increment);

    if (newVal === currentVal) return;

    try {
      const resp = await updateItem(row.actoliturgicoid, { act_max_reservas: newVal });
      if (resp.success) {
        list();
      } else {
        alert('Error al actualizar: ' + (resp.error || 'Desconocido'));
      }
    } catch (e) {
      console.error('Error updating max reservas:', e);
    }
  }, [updateItem, list]);

  const columns = useMemo(() => {
    const canEdit = hasPermission('liturgico_actos_editar');
    const canDelete = hasPermission('liturgico_actos_eliminar');
    const canViewDetail = true; // Todos pueden ver detalle si pueden listar

    return [
      {
        key: 'parroquia_nombre',
        header: 'Parroquia',
        width: '15%',
        render: (r) => (
          <div className="flex items-center gap-2">
            <Church className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900">{r.parroquia_nombre}</span>
          </div>
        ),
      },
      {
        key: 'act_nombre',
        header: 'Tipo Acto',
        width: '10%',
        render: (r) => (
          <span className="text-sm font-medium text-gray-700">
            {labelByActo[r.act_nombre] || r.act_nombre}
          </span>
        ),
      },
      {
        key: 'act_titulo',
        header: 'Título',
        width: '15%',
        render: (r) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{r.act_titulo}</span>
            <span className="text-xs text-gray-500">
              {r.h_fecha} {r.h_hora}
            </span>
          </div>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        width: '7%',
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
        key: 'max_reservas',
        header: 'Máx. Reservas',
        width: '11%',
        align: 'center',
        render: (r) => (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleUpdateMaxReservas(r, -1); }}
              className="p-1 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
              title="Disminuir"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium min-w-[20px] text-center" style={{ color: 'var(--text)' }}>
              {r.act_max_reservas !== null ? r.act_max_reservas : '∞'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleUpdateMaxReservas(r, 1); }}
              className="p-1 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
              title="Aumentar"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ),
      },
      {
        key: 'cupos',
        header: 'Cupos',
        width: '7%',
        align: 'center',
        render: (r) => {
          const maxReservas = r.act_max_reservas || 0;
          const reservasTotal = r.reservas_total || 0;
          const cuposDisponibles = maxReservas > 0 ? maxReservas - reservasTotal : '∞';

          // Determinar color según disponibilidad
          let colorClass = 'text-green-600'; // Verde por defecto (hay cupos)
          if (maxReservas > 0) {
            if (cuposDisponibles === 0) {
              colorClass = 'text-red-600'; // Rojo si no hay cupos
            } else if (cuposDisponibles <= maxReservas * 0.3) {
              colorClass = 'text-yellow-600'; // Amarillo si quedan pocos
            }
          }

          return (
            <span className={`text-sm font-bold ${colorClass}`}>
              {cuposDisponibles}
            </span>
          );
        },
      },
      buildActionColumn({
        onEdit: canEdit
          ? (row) => {
            setViewMode(false);
            setCurrent(row);
            setModalOpen(true);
          }
          : null,
        onDelete: canDelete ? (row) => handleDelete(row) : null,
        onView: canViewDetail
          ? (row) => {
            console.log('[ActoLiturgico] Ver más row:', row);
            setViewMode(true);
            setCurrent(row);
            setModalOpen(true);
          }
          : null,
        width: '35%',
      }),
    ];
  }, [hasPermission, labelByActo, handleUpdateMaxReservas]);

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
              setCurrent(null);
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
          striped
          headerSticky
          emptyText="No hay actos litúrgicos"
        />
      </Card>

      <ModalActoLiturgico
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCurrent(null);
          setViewMode(false);
        }}
        initialValues={current || {}}
        readOnly={viewMode}
        onCreated={(data) => {
          console.log('Acto creado/actualizado:', data);
          list && list();
          setModalOpen(false);
          setCurrent(null);
          setViewMode(false);
        }}
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

