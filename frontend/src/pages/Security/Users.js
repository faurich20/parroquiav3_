// parroquia-frontend/src/pages/Security/User.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Edit, Trash2, Shield, Loader, Eye } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import ActionButton from '../../components/Common/ActionButton';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import UserModal from "../../components/Modals/UserModal";
import useCrud from '../../hooks/useCrud';
import TablaBase from '../../components/Common/TablaBase';

const UsersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [selectedUser, setSelectedUser] = useState(null);
    const { items: users, setItems, loading, error, createItem, updateItem, removeItem, updateStatus } = useCrud('http://localhost:5000/api/users');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const itemsPerPage = 7;

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

    // Centralizar submit del modal
    const handleModalSubmit = async (userData, action) => {
        try {
            if (action === 'create') {
                return await handleCreateUser(userData);
            } else if (action === 'edit') {
                return await handleEditUser(selectedUser?.id, userData);
            }
        } catch (error) {
            console.error('Error en handleModalSubmit:', error);
            return { success: false, error: error.message };
        }
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

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
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
                        {
                            key: 'ultimo', header: 'Último Acceso', width: '15%', render: (user) => (
                                <span>{user.last_login ? new Date(user.last_login).toLocaleString('es-ES') : 'Nunca'}</span>
                            )
                        },
                        {
                            key: 'acciones', header: 'Acciones', width: '35%', align: 'center', render: (user) => (
                                <div className="flex items-center justify-center gap-2">
                                    <ActionButton color="theme" icon={Edit} onClick={() => openEditModal(user)} title="Editar usuario">Editar</ActionButton>
                                    <ActionButton color="red" icon={Trash2} onClick={() => requestDeleteUser(user.id)} title="Eliminar usuario">Eliminar</ActionButton>
                                    <ActionButton color="blue" icon={Eye} onClick={() => openViewModal(user)} title="Ver más">Ver más</ActionButton>
                                </div>
                            )
                        }
                    ];
                    return (
                        <TablaBase
                            columns={columns}
                            data={currentUsers}
                            rowKey={(u) => u.id}
                            hover
                            striped
                            emptyText="No hay usuarios"
                        />
                    );
                })()}

                {/* Paginación */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>Página</span>
                        <input
                            type="number"
                            min={1}
                            max={totalPages || 1}
                            value={currentPage}
                            onChange={(e) => {
                                const n = parseInt(e.target.value || '1', 10);
                                if (Number.isNaN(n)) return;
                                const max = totalPages || 1;
                                const clamped = Math.max(1, Math.min(n, max));
                                setCurrentPage(clamped);
                            }}
                            className="w-14 px-2 py-1 rounded-lg text-center text-sm"
                            style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                        />
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>de {totalPages || 1}</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
                            style={{ borderColor: 'var(--border)' }}
                        >
                            Anterior
                        </button>

                        {Array.from({ length: totalPages || 1 }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`px-3 py-1 rounded-lg border text-sm transition-colors`}
                                style={
                                    currentPage === i + 1
                                        ? { background: 'var(--primary)', color: '#ffffff', borderColor: 'var(--primary)' }
                                        : { borderColor: 'var(--border)' }
                                }
                            >
                                {i + 1}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
                            disabled={currentPage === (totalPages || 1)}
                            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
                            style={{ borderColor: 'var(--border)' }}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </Card>

            {/* Modal unificado */}
            <UserModal
                isOpen={isModalOpen}
                mode={modalMode}
                user={selectedUser}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
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