// parroquia-frontend/src/pages/Security/Permissions.js
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Search, Save, Loader, User, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ETIQUETAS_PERMISOS } from '../../constants/permissions';
import useCatalogoPermisos from '../../hooks/useCatalogoPermisos';

const PermissionsPage = () => {
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    const { authFetch, user, reloadProfile } = useAuth();
    const { theme } = useTheme();
    const isDarkTheme = theme === 'black';

    const { ids: permissionsCatalog } = useCatalogoPermisos();

    const availablePermissions = permissionsCatalog.map(id => ({
        id,
        name: ETIQUETAS_PERMISOS[id] || id,
        description: `Acceso a ${ETIQUETAS_PERMISOS[id] || id}`
    }));

    // Cargar roles
    const didFetchRef = useRef(false);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                setLoading(true);
                const response = await authFetch('http://localhost:5000/api/roles');

                if (!response.ok) {
                    throw new Error('Error al obtener roles');
                }

                const data = await response.json();
                const rows = Array.isArray(data) ? data : (data.roles || []);
                setRoles(rows);
            } catch (err) {
                console.error('Error obteniendo roles:', err);
                setMessage({ type: 'error', text: 'Error al cargar roles' });
            } finally {
                setLoading(false);
            }
        };

        if (didFetchRef.current) return;
        didFetchRef.current = true;
        fetchRoles();
    }, []);

    // Seleccionar rol y cargar sus permisos
    const handleSelectRole = (role) => {
        setSelectedRole(role);
        setPermissions(role.permissions || []);
        setMessage({ type: '', text: '' });
    };

    // Toggle permiso
    const togglePermission = (permissionId) => {
        if (permissions.includes(permissionId)) {
            setPermissions(permissions.filter(p => p !== permissionId));
        } else {
            setPermissions([...permissions, permissionId]);
        }
    };

    // Guardar permisos
    const handleSavePermissions = async () => {
        if (!selectedRole) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await authFetch(`http://localhost:5000/api/roles/${selectedRole.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: selectedRole.name,
                    description: selectedRole.description,
                    permissions: permissions,
                    status: selectedRole.status
                })
            });

            if (!response.ok) {
                throw new Error('Error al actualizar permisos');
            }

            const data = await response.json();
            const updated = data.role || data;
            // Actualizar rol en la lista
            setRoles(roles.map(r => r.id === selectedRole.id ? updated : r));
            setSelectedRole(updated);

            // Si el rol actualizado es el mismo que el del usuario actual, recargar perfil
            if (user && user.role === updated.name) {
                await reloadProfile();
            }

            setMessage({ type: 'success', text: 'Permisos del rol actualizados correctamente' });
            
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error('Error guardando permisos del rol:', err);
            setMessage({ type: 'error', text: 'Error al guardar permisos del rol' });
        } finally {
            setSaving(false);
        }
    };

    const filteredRoles = roles.filter(role =>
        String(role.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(role.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Permisos"
                subtitle="Configura los permisos de acceso para cada rol"
                icon={Settings}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel izquierdo - Lista de roles */}
                <Card>
                    <div className="p-4 border-b">
                        <h3 className={`text-lg font-semibold mb-4 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Seleccionar Rol</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar rol..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                        {filteredRoles.length > 0 ? (
                            filteredRoles.map((role) => (
                                <motion.div
                                    key={role.id}
                                    onClick={() => handleSelectRole(role)}
                                    className={`group p-4 border-b cursor-pointer transition-colors ${
                                        selectedRole?.id === role.id
                                            ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                            : 'hover:bg-gray-50'
                                    }`}
                                    whileHover={{ x: 4 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                                            style={{
                                                background: "linear-gradient(135deg, var(--primary), var(--secondary))"
                                            }}
                                        >
                                            {String(role.name || '').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`font-medium truncate ${
                                                    selectedRole?.id === role.id
                                                        ? 'text-gray-900'
                                                        : (isDarkTheme ? 'text-white group-hover:text-gray-900' : 'text-gray-900')
                                                }`}
                                            >
                                                {role.name}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {role.permissions?.length || 0} permisos
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                No se encontraron roles
                            </div>
                        )}
                    </div>
                </Card>

                {/* Panel derecho - Permisos del rol seleccionado */}
                <div className="lg:col-span-2">
                    <Card>
                        {selectedRole ? (
                            <div className="p-6">
                                {/* Header del rol */}
                                <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                                        style={{
                                            background: "linear-gradient(135deg, var(--primary), var(--secondary))"
                                        }}
                                    >
                                        {String(selectedRole.name || '').charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedRole.name}</h3>
                                        <p className="text-gray-600">{selectedRole.description || 'Sin descripcifn'}</p>
                                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                            {String(selectedRole.status || 'Activo')}
                                        </span>
                                    </div>
                                </div>

                                {/* Mensaje de éxito/error */}
                                {message.text && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                                            message.type === 'success'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {message.type === 'success' ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <X className="w-5 h-5" />
                                        )}
                                        {message.text}
                                    </motion.div>
                                )}

                                {/* Grid de permisos */}
                                <div>
                                    <h4 className={`text-lg font-semibold mb-4 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                                        Permisos de Acceso
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {availablePermissions.map((perm) => (
                                            <motion.div
                                                key={perm.id}
                                                whileHover={{ scale: 1.02 }}
                                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                    permissions.includes(perm.id)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                onClick={() => togglePermission(perm.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 mt-1">
                                                        <div
                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                                permissions.includes(perm.id)
                                                                    ? 'bg-blue-600 border-blue-600'
                                                                    : 'border-gray-300'
                                                            }`}
                                                        >
                                                            {permissions.includes(perm.id) && (
                                                                <Check className="w-3 h-3 text-white" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${permissions.includes(perm.id) ? 'text-gray-900' : (isDarkTheme ? 'text-white' : 'text-gray-900')}`}>
                                                            {perm.name}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {perm.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Botón guardar */}
                                <div className="mt-6">
                                    <motion.button
                                        onClick={handleSavePermissions}
                                        disabled={saving}
                                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        {saving ? (
                                            <Loader className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                                    </motion.button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className={`text-lg font-semibold mb-2 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                                    Selecciona un Rol
                                </h3>
                                <p className="text-gray-600">
                                    Elige un rol de la lista para gestionar sus permisos
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PermissionsPage;
