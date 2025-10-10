// parroquia-frontend/src/pages/Security/User.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Edit, Trash2, Shield, Loader, Eye } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import ActionButton from '../../components/Common/ActionButton';
import UserModal from "../../components/Modals/UserModal";

import { useAuth } from '../../contexts/AuthContext';

const UsersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const itemsPerPage = 7;

    const { authFetch } = useAuth();

    // Obtener usuarios desde el backend
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await authFetch('http://localhost:5000/api/users');

                if (!response.ok) {
                    throw new Error('Error al obtener usuarios');
                }

                const data = await response.json();
                setUsers(data.users || []);
            } catch (err) {
                setError(err.message);
                console.error('Error obteniendo usuarios:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [authFetch]);

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
        try {
            const response = await authFetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear usuario');
            }

            const data = await response.json();
            setUsers(prevUsers => [...prevUsers, data.user]);
            return { success: true, message: data.message };
        } catch (err) {
            console.error('Error en handleCreateUser:', err);
            return { success: false, error: err.message };
        }
    };

    // Editar usuario
    const handleEditUser = async (userId, userData) => {
        try {
            const response = await authFetch(`http://localhost:5000/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar usuario');
            }

            const data = await response.json();
            setUsers(prevUsers =>
                prevUsers.map(user => user.id === userId ? data.user : user)
            );
            return { success: true, message: data.message };
        } catch (err) {
            console.error('Error actualizando usuario:', err);
            return { success: false, error: err.message };
        }
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
        try {
            const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
            const response = await authFetch(`http://localhost:5000/api/users/${userId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === userId ? { ...user, status: newStatus } : user
                    )
                );
            } else {
                throw new Error('Error al cambiar estado');
            }
        } catch (err) {
            console.error('Error cambiando estado:', err);
            alert('Error al cambiar el estado del usuario');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
            try {
                const response = await authFetch(`http://localhost:5000/api/users/${userId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
                } else {
                    throw new Error('Error al eliminar usuario');
                }
            } catch (err) {
                console.error('Error eliminando usuario:', err);
                alert('Error al eliminar el usuario');
            }
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
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all"
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
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar usuarios..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-4 font-semibold text-gray-900" style={{ width: '25%' }}>Usuario</th>
                                <th className="text-center py-2 px-4 font-semibold text-gray-900" style={{ width: '10%' }}>Rol</th>
                                <th className="text-center py-2 px-4 font-semibold text-gray-900" style={{ width: '15%' }}>Estado</th>
                                <th className="text-left py-2 px-4 font-semibold text-gray-900" style={{ width: '15%' }}>Último Acceso</th>
                                <th className="text-center py-2 px-4 font-semibold text-gray-900" style={{ width: '35%' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentUsers.length > 0 ? (
                                currentUsers.map((user, index) => (
                                    <motion.tr
                                        key={user.id}
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                        background: "linear-gradient(135deg, var(--primary), var(--secondary))"
                                                    }}
                                                >
                                                    <span className="text-white font-medium">
                                                        {user.name.charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                                                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                                                user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                                user.role === 'secretaria' ? 'bg-blue-100 text-blue-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                <Shield className="w-3 h-3" />
                                                <span className="truncate">{user.role}</span>
                                            </span>
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                                                    user.status === 'Activo' ? 
                                                    'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {user.status}
                                                </span>
                                                <button
                                                    className={`px-2 py-1 rounded-lg text-white text-xs font-medium transition whitespace-nowrap ${
                                                        user.status === 'Activo'
                                                        ? 'bg-red-500 hover:bg-red-600'
                                                        : 'bg-blue-500 hover:bg-blue-600'
                                                    }`}
                                                    onClick={() => handleStatusChange(user.id, user.status)}
                                                >
                                                    {user.status === 'Activo' ? 'Dar Baja' : 'Dar Alta'}
                                                </button>
                                            </div>
                                        </td>

                                        <td className="py-2 px-4 text-sm text-gray-600">
                                            {user.last_login ? new Date(user.last_login).toLocaleString('es-ES') : 'Nunca'}
                                        </td>

                                        <td className="py-2 px-4">
                                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                                <ActionButton
                                                    color="blue"
                                                    icon={Edit}
                                                    onClick={() => openEditModal(user)}
                                                    title="Editar usuario"
                                                >
                                                    Editar
                                                </ActionButton>
                                                <ActionButton
                                                    color="red"
                                                    icon={Trash2}
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="Eliminar usuario"
                                                >
                                                    Eliminar
                                                </ActionButton>
                                                <ActionButton
                                                    color="blue"
                                                    icon={Eye}
                                                    onClick={() => openViewModal(user)}
                                                    title="Ver información del usuario"
                                                >
                                                    Ver más
                                                </ActionButton>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-6 text-gray-500">
                                        {users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="flex justify-between items-center mt-4 px-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Página</span>
                        <input
                            type="number"
                            value={currentPage}
                            min={1}
                            max={totalPages}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                if (value >= 1 && value <= totalPages) {
                                    setCurrentPage(value);
                                }
                            }}
                            className="w-14 px-2 py-1 border rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span>de {totalPages || 1}</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
                        >
                            Anterior
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`px-3 py-1 rounded-lg border text-sm transition-colors ${currentPage === i + 1
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'hover:bg-gray-100'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
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
        </div>
    );
};

export default UsersPage;