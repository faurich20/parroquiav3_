import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Loader, Search } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { useAuth } from '../../contexts/AuthContext';
import useCrud from '../../hooks/useCrud';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { buildActionColumn } from '../../components/Common/ActionColumn';

const RolesPage = () => {
  const { hasPermission } = useAuth();
  const {
    items: roles,
    loading,
    error,
    createItem,
    updateItem,
    removeItem,
    updateStatus,
  } = useCrud('http://localhost:5000/api/roles');

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add | edit | view
  const [selectedRole, setSelectedRole] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Permisos finos: solo el permiso específico de acción
  const canCreate = hasPermission('seguridad_roles_crear');
  const canChangeStatus = hasPermission('seguridad_roles_cambiar_estado');
  const canEdit = hasPermission('seguridad_roles_editar');
  const canDelete = hasPermission('seguridad_roles_eliminar');
  const canView = hasPermission('seguridad_roles_ver');

  const openAddModal = () => {
    setModalMode('add');
    setSelectedRole(null);
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setModalMode('edit');
    setSelectedRole(role);
    setModalOpen(true);
  };

  const openViewModal = (role) => {
    setModalMode('view');
    setSelectedRole(role);
    setModalOpen(true);
  };

  const handleCreateRole = async (values) => {
    const payload = {
      name: values.nombre,
      description: values.descripcion,
      status: values.estado,
    };
    const resp = await createItem(payload);
    return resp.success ? { success: true } : { success: false, error: resp.error };
  };

  const handleEditRole = async (values) => {
    if (!selectedRole) return { success: false, error: 'Rol no seleccionado' };
    const payload = {
      name: values.nombre,
      description: values.descripcion,
      status: values.estado,
    };
    const resp = await updateItem(selectedRole.id, payload);
    return resp.success ? { success: true } : { success: false, error: resp.error };
  };

  const handleChangeStatus = async (role) => {
    const nuevo = role.status === 'Activo' ? 'Inactivo' : 'Activo';
    const resp = await updateStatus(role.id, nuevo);
    if (!resp.success) {
      alert(resp.error || 'Error al cambiar estado');
    }
  };

  const requestDeleteRole = (roleId) => {
    setDeleteTarget(roleId);
    setConfirmOpen(true);
  };

  const confirmDeleteRole = async () => {
    const roleId = deleteTarget;
    setConfirmOpen(false);
    setDeleteTarget(null);
    if (!roleId) return;
    const resp = await removeItem(roleId);
    if (!resp.success) {
      alert(resp.error || 'Error al eliminar rol');
    }
  };

  const filteredRoles = (roles || []).filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.description || '').toLowerCase().includes(q)
    );
  });

  if (loading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: '20%',
      render: (r) => r.name,
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      width: '20%',
      render: (r) => (
        <span style={{ color: 'var(--muted)' }}>{r.description || '-'}</span>
      ),
    },
    {
      key: 'permisos',
      header: 'Permisos',
      width: '8%',
      align: 'center',
      render: (r) => (Array.isArray(r.permissions) ? r.permissions.length : 0),
    },
    {
      key: 'estado',
      header: 'Estado',
      width: '17%',
      align: 'center',
      render: (r) => (
        <div className="flex flex-col items-center gap-1">
          <span
            className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${String(r.status).toLowerCase() === 'activo'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
              }`}
          >
            {String(r.status).toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
          {canChangeStatus && (
            <button
              className={`px-2 py-1 rounded-lg text-white text-xs font-medium transition whitespace-nowrap ${r.status === 'Activo'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
                }`}
              onClick={() => handleChangeStatus(r)}
            >
              {r.status === 'Activo' ? 'Dar Baja' : 'Dar Alta'}
            </button>
          )}
        </div>
      ),
    },
    buildActionColumn({
      onEdit: canEdit ? (row) => openEditModal(row) : null,
      onDelete: canDelete ? (row) => requestDeleteRole(row.id) : null,
      onView: canView ? (row) => openViewModal(row) : null,
      width: '35%',
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Roles"
        subtitle="Administra los roles y permisos del sistema"
        icon={Shield}
      >
        {canCreate && (
          <motion.button
            onClick={openAddModal}
            className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Rol
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
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl focus:ring-2 transition"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
        </div>

        <TablaConPaginacion
          columns={columns}
          data={filteredRoles}
          rowKey={(r) => r.id}
          searchTerm={searchTerm}
          searchKeys={['name', 'description']}
          hover
          striped
          emptyText="Sin roles"
        />
      </Card>

      <ModalCrudGenerico
        isOpen={modalOpen}
        mode={modalMode === 'add' ? 'add' : modalMode === 'edit' ? 'edit' : 'view'}
        title={
          modalMode === 'add'
            ? 'Nuevo Rol'
            : modalMode === 'edit'
              ? 'Editar Rol'
              : 'Información del Rol'
        }
        icon={Shield}
        initialValues={
          selectedRole
            ? {
              nombre: selectedRole.name || '',
              descripcion: selectedRole.description || '',
              estado: selectedRole.status || 'Activo',
            }
            : { nombre: '', descripcion: '', estado: 'Activo' }
        }
        size="xl"
        validate={(vals) => {
          if (!vals.nombre || !vals.nombre.trim()) return 'El nombre es requerido';
          if (vals.nombre.length < 3)
            return 'El nombre debe tener al menos 3 caracteres';
          if (!['Activo', 'Inactivo'].includes(vals.estado)) return 'Estado inv�lido';
          return null;
        }}
        fields={[
          {
            name: 'nombre',
            label: 'Nombre *',
            type: 'text',
            placeholder: 'Ej: Admin',
          },
          {
            name: 'descripcion',
            label: 'Descripción',
            type: 'textarea',
            placeholder: 'Describe el rol',
          },
          {
            name: 'estado',
            label: 'Estado',
            type: 'select',
            options: [
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ],
          },
        ]}
        readOnlyContent={(vals) => (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Nombre
              </label>
              <div className="font-medium" style={{ color: 'var(--text)' }}>
                {vals.nombre || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Descripción
              </label>
              <div style={{ color: 'var(--text)' }}>
                {vals.descripcion || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Estado
              </label>
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${String(vals.estado).toLowerCase() === 'activo'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
                  }`}
              >
                {String(vals.estado).toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        )}
        onSubmit={(vals) =>
          modalMode === 'add' ? handleCreateRole(vals) : handleEditRole(vals)
        }
        onClose={() => setModalOpen(false)}
      />

      <DialogoConfirmacion
        abierto={confirmOpen}
        titulo="Eliminar rol"
        mensaje="¿Estás seguro de eliminar este rol? Esta acción no se puede deshacer."
        onConfirmar={confirmDeleteRole}
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

export default RolesPage;
