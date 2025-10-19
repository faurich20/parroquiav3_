// parroquia-frontend/src/pages/Security/User.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Edit, Trash2, Shield, Loader, Eye, EyeOff } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import ActionButton from '../../components/Common/ActionButton';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico';
import useCrud from '../../hooks/useCrud';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import SelectorRol from '../../components/Form/SelectorRol';
import { useAuth } from '../../contexts/AuthContext';
import { buildActionColumn } from '../../components/Common/ActionColumn';

const UsersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [selectedUser, setSelectedUser] = useState(null);
    const { items: users, setItems, loading, error, createItem, updateItem, removeItem, updateStatus } = useCrud('http://localhost:5000/api/users');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const { authFetch } = useAuth();
    const [rolesList, setRolesList] = useState([]);
    const [parroquias, setParroquias] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const validRoles = ['admin', 'secretaria', 'tesorero', 'colaborador', 'user'];

    React.useEffect(() => {
        const loadRoles = async () => {
            try {
                const resp = await authFetch('http://localhost:5000/api/roles');
                if (!resp.ok) return;
                const data = await resp.json();
                setRolesList(Array.isArray(data.roles) ? data.roles : []);
            } catch {}
        };
        const loadParroquias = async () => {
            try {
                const resp = await authFetch('http://localhost:5000/api/parroquias');
                if (!resp.ok) return;
                const data = await resp.json();
                setParroquias(Array.isArray(data.parroquias) ? data.parroquias : []);
            } catch {}
        };
        if (isModalOpen) { loadRoles(); loadParroquias(); }
    }, [isModalOpen, authFetch]);

    // Funciones para abrir modales
    const openAddModal = () => {
        setModalMode("add");
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setModalMode("edit");
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const openViewModal = (user) => {
        setModalMode("view");
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    // Crear usuario
    const handleCreateUser = async (userData) => {
        const resp = await createItem(userData);
        return resp.success ? { success: true } : { success: false, error: resp.error };
    };

    // Editar usuario
    const handleEditUser = async (userId, userData) => {
        const resp = await updateItem(userId, userData);
        return resp.success ? { success: true } : { success: false, error: resp.error };
    };

    const checkEmailExists = async (email) => {
        const endpoints = [
            `http://localhost:5000/api/users/exists?email=${encodeURIComponent(email)}`,
            `http://localhost:5000/api/users/check-email?email=${encodeURIComponent(email)}`,
            `http://localhost:5000/api/users?email=${encodeURIComponent(email)}`,
        ];
        for (const url of endpoints) {
            try {
                const resp = await authFetch(url, { method: 'GET' });
                if (!resp.ok) continue;
                const data = await resp.json();
                if (Array.isArray(data)) {
                    return data.some(u => (u.email || '').toLowerCase() === email.toLowerCase());
                }
                if (data && typeof data === 'object') {
                    if (typeof data.exists === 'boolean') return data.exists;
                    if (typeof data.found === 'boolean') return data.found;
                    if (typeof data.available === 'boolean') return !data.available;
                    if (Array.isArray(data.users)) return data.users.some(u => (u.email || '').toLowerCase() === email.toLowerCase());
                }
            } catch {}
        }
        return false;
    };

    const handleStatusChange = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
        const resp = await updateStatus(userId, newStatus);
        if (!resp.success) {
            alert('Error al cambiar el estado del usuario');
        }
    };

    const requestDeleteUser = (userId) => {
        setDeleteTarget(userId);
        setConfirmOpen(true);
    };

    const confirmDeleteUser = async () => {
        const userId = deleteTarget;
        setConfirmOpen(false);
        setDeleteTarget(null);
        if (!userId) return;
        const resp = await removeItem(userId);
        if (!resp.success) {
            alert('Error al eliminar el usuario');
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando usuarios...</p>
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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Usuarios"
                subtitle="Administra los usuarios del sistema"
                icon={Users}
            >
                <motion.button
                    onClick={openAddModal}
                    className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
                </motion.button>
            </PageHeader>

            <Card>
                {/* Buscador */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar usuarios..."
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
                    const columns = [
                        {
                            key: 'usuario', header: 'Usuario', width: '25%', render: (user) => (
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                                        <span className="text-white text-sm font-bold">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{user.name}</p>
                                        <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{user.email}</p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'rol', header: 'Rol', width: '10%', align: 'center', render: (user) => (
                                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                    {typeof user.role === 'object' ? (user.role.name || user.role.id || '') : user.role}
                                </span>
                            )
                        },
                        {
                            key: 'estado', header: 'Estado', width: '15%', align: 'center', render: (user) => (
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${String(user.status).toLowerCase() === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {String(user.status).toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <button
                                        className={`px-2 py-1 rounded-lg text-white text-xs font-medium transition whitespace-nowrap ${user.status === 'Activo' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                                        onClick={() => handleStatusChange(user.id, user.status)}
                                    >
                                        {user.status === 'Activo' ? 'Dar Baja' : 'Dar Alta'}
                                    </button>
                                </div>
                            )
                        },
                        buildActionColumn({
                            onEdit: (row) => openEditModal(row),
                            onDelete: (row) => requestDeleteUser(row.id),
                            onView: (row) => openViewModal(row),
                            width: '35%'
                        })
                    ];
                    return (
                        <TablaConPaginacion
                            columns={columns}
                            data={users}
                            rowKey={(u) => u.id}
                            searchTerm={searchTerm}
                            searchKeys={['name', 'email']}
                            itemsPerPage={7}
                            hover
                            striped
                            emptyText="No hay usuarios"
                        />
                    );
                })()}
            </Card>

            {/* Modal unificado */}
            <ModalCrudGenerico
                isOpen={isModalOpen}
                mode={modalMode}
                title={modalMode === 'add' ? 'Nuevo Usuario' : modalMode === 'edit' ? 'Editar Usuario' : 'Información del Usuario'}
                icon={Users}
                initialValues={selectedUser ? {
                    name: selectedUser.name || '',
                    email: selectedUser.email || '',
                    role: typeof selectedUser.role === 'object' ? (selectedUser.role.name || 'user') : (selectedUser.role || 'user'),
                    password: '',
                    confirmPassword: '',
                    per_nombres: selectedUser.persona?.per_nombres || selectedUser.name || '',
                    per_apellidos: selectedUser.persona?.per_apellidos || '',
                    per_domicilio: selectedUser.persona?.per_domicilio || '',
                    per_telefono: selectedUser.persona?.per_telefono || '',
                    fecha_nacimiento: selectedUser.persona?.fecha_nacimiento || '',
                    parroquiaid: selectedUser.persona?.parroquiaid || ''
                } : {
                    name: '', email: '', role: 'user', password: '', confirmPassword: '', per_nombres: '', per_apellidos: '', per_domicilio: '', per_telefono: '', fecha_nacimiento: '', parroquiaid: ''
                }}
                fields={[
                    { name: 'name', label: 'Nombre de usuario o alias *', type: 'text' },
                    { name: 'email', label: 'Correo electrónico *', type: 'email' },
                    {
                        name: 'role',
                        label: 'Rol *',
                        type: 'custom',
                        render: (value, setValue, form, disabled) => (
                            <div key="role">
                                <label className="block text-sm font-medium text-gray-500 mb-1">Rol *</label>
                                <SelectorRol value={value} onChange={setValue} disabled={disabled} className="text-gray-900" roles={rolesList.length ? rolesList.map(r => r.name) : validRoles} />
                            </div>
                        )
                    },
                    {
                        name: 'password',
                        label: 'Contraseña',
                        type: 'custom',
                        render: (value, setValue) => (
                            <div key="password">
                                <label className="block text-sm font-medium text-gray-500 mb-1">{modalMode === 'add' ? 'Contraseña *' : 'Contraseña (dejar vacío para no cambiar)'}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={value || ''}
                                        onChange={(e) => setValue(e.target.value)}
                                        required={modalMode === 'add'}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )
                    },
                    {
                        name: 'confirmPassword',
                        label: 'Confirmar contraseña',
                        type: 'custom',
                        render: (value, setValue, form) => (
                            (modalMode === 'add' || form.password) ? (
                                <div key="confirmPassword">
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Confirmar contraseña *</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={value || ''}
                                            onChange={(e) => setValue(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ) : null
                        )
                    },
                    { name: 'per_nombres', label: 'Nombres *', type: 'text' },
                    { name: 'per_apellidos', label: 'Apellidos *', type: 'text' },
                    { name: 'fecha_nacimiento', label: 'Fecha de nacimiento *', type: 'date' },
                    {
                        name: 'parroquiaid',
                        label: 'Parroquia *',
                        type: 'select',
                        options: [{ value: '', label: 'Seleccione una parroquia' }, ...parroquias.map(p => ({ value: p.parroquiaid, label: p.par_nombre }))]
                    },
                    { name: 'per_domicilio', label: 'Domicilio', type: 'text' },
                    { name: 'per_telefono', label: 'Teléfono', type: 'text' },
                ]}
                validate={async (v) => {
                    if (!v.name || !v.name.trim()) return 'El nombre es requerido';
                    if (v.name.length < 3) return 'El nombre debe tener al menos 3 caracteres';
                    if (v.name.length > 100) return 'El nombre no puede superar 100 caracteres';
                    if (!v.email || !v.email.trim()) return 'El email es requerido';
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(v.email)) return 'Formato de email inválido';
                    if (modalMode === 'add' || v.password) {
                        if (!v.password) return 'La contraseña es requerida';
                        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
                        if (!passwordRegex.test(v.password)) return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';
                        if (v.password !== v.confirmPassword) return 'Las contraseñas no coinciden';
                    }
                    const rolesValidos = rolesList.length ? rolesList.map(r => r.name) : validRoles;
                    if (!rolesValidos.includes(v.role)) return 'Rol inválido';
                    if (modalMode === 'add') {
                        if (!v.per_nombres?.trim()) return 'Los nombres de la persona son requeridos';
                        if (!v.per_apellidos?.trim()) return 'Los apellidos de la persona son requeridos';
                        if (!v.fecha_nacimiento) return 'La fecha de nacimiento es requerida';
                        if (!v.parroquiaid) return 'La parroquia es requerida';
                    }
                    const emailToCheck = v.email.trim().toLowerCase();
                    const original = (selectedUser?.email || '').toLowerCase();
                    if (modalMode === 'add' || (modalMode === 'edit' && emailToCheck !== original)) {
                        const exists = await checkEmailExists(emailToCheck);
                        if (exists) return 'El email ya está registrado';
                    }
                    return null;
                }}
                onSubmit={async (vals) => {
                    const userData = {
                        name: vals.name.trim(),
                        email: vals.email.trim().toLowerCase(),
                        role: vals.role,
                        persona: {
                            per_nombres: (vals.per_nombres || vals.name).trim(),
                            per_apellidos: (vals.per_apellidos || '').trim(),
                            per_domicilio: (vals.per_domicilio || '').trim(),
                            per_telefono: (vals.per_telefono || '').trim(),
                            fecha_nacimiento: vals.fecha_nacimiento || null,
                            parroquiaid: vals.parroquiaid ? Number(vals.parroquiaid) : null
                        }
                    };
                    if (modalMode === 'add') userData.password = vals.password;
                    else if (vals.password) userData.password = vals.password;
                    if (modalMode === 'add') return await handleCreateUser(userData);
                    if (modalMode === 'edit') return await handleEditUser(selectedUser?.id, userData);
                    return { success: false, error: 'Modo no soportado' };
                }}
                onClose={() => setIsModalOpen(false)}
                size="xl"
                readOnlyContent={(vals) => (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center space-x-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {(selectedUser?.name || vals.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{selectedUser?.name || vals.name || 'Usuario sin nombre'}</h3>
                                <p className="text-gray-600">{selectedUser?.email || vals.email || 'Sin email'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="bg-white p-4 border rounded-lg">
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Rol del usuario</label>
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                        <span className="text-lg font-medium text-gray-900">{typeof selectedUser?.role === 'object' ? (selectedUser?.role?.name) : (selectedUser?.role || vals.role)}</span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 border rounded-lg">
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Estado actual</label>
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${String(selectedUser?.status || 'inactivo').toLowerCase() === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {String(selectedUser?.status || 'inactivo').toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white p-4 border rounded-lg">
                                <label className="block text-sm font-medium text-gray-500 mb-3">Permisos asignados ({selectedUser?.permissions?.length || 0})</label>
                                {selectedUser?.permissions && selectedUser.permissions.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedUser.permissions.map((permission, index) => (
                                            <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                                <span className="text-sm text-blue-800 font-medium">{permission}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-500 italic">No hay permisos asignados</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            />

            {/* Diálogo de confirmación */}
            <DialogoConfirmacion
                abierto={confirmOpen}
                titulo="Eliminar usuario"
                mensaje="¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer."
                onConfirmar={confirmDeleteUser}
                onCancelar={() => { setConfirmOpen(false); setDeleteTarget(null); }}
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default UsersPage;