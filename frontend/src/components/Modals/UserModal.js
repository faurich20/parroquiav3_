// parroquia-frontend/src/components/Modals/UserModal.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader, Eye, EyeOff, User } from 'lucide-react';

const UserModal = ({ isOpen, mode, user, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        status: 'activo'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validRoles = ['admin', 'secretaria', 'tesorero', 'colaborador', 'user'];

    const getRoleName = (role) => {
        const roleNames = {
            'admin': 'Administrador',
            'secretaria': 'Secretaria',
            'tesorero': 'Tesorero',
            'colaborador': 'Colaborador',
            'user': 'Usuario'
        };
        return roleNames[role] || role;
    };

    const getStatusName = (status) => {
        return status === 'activo' ? 'Activo' : 'Inactivo';
    };

    const getStatusClass = (status) => {
        return status === 'activo' 
            ? 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm'
            : 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm';
    };

    const getPermissionName = (permission) => {
        const translations = {
            'dashboard': 'Menu Principal',
            'security': 'Seguridad',
            'personal': 'Personal',
            'liturgical': 'Litúrgico',
            'accounting': 'Contabilidad',
            'sales': 'Ventas',
            'purchases': 'Compras',
            'warehouse': 'Almacén',
            'configuration': 'Configuración',
            'reports': 'Reportes'
        };
        return translations[permission] || permission;
    };

    const checkEmailExists = async (email) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('Token de autenticación no encontrado');
            }
            
            const url = `http://localhost:5000/api/users/check-email?email=${encodeURIComponent(email)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('El servidor no está respondiendo correctamente.');
            }
            
            if (response.ok) {
                const data = await response.json();
                return data.exists;
            } else if (response.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
            }
        } catch (err) {
            throw err;
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isOpen]);

    useEffect(() => {
        if ((mode === 'edit' || mode === 'view') && user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                confirmPassword: '',
                role: user.role || 'user',
                status: user.status || 'activo'
            });
        } else {
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'user',
                status: 'activo'
            });
        }
        setError('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    }, [mode, user, isOpen]);

    const validate = () => {
        if (!formData.name.trim()) return 'El nombre es requerido';
        if (formData.name.length < 3) return 'El nombre debe tener al menos 3 caracteres';
        if (formData.name.length > 100) return 'El nombre no puede superar 100 caracteres';
        if (!formData.email.trim()) return 'El email es requerido';
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) return 'Formato de email inválido';

        if (mode === 'add' || formData.password) {
            if (!formData.password) return 'La contraseña es requerida';
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
            if (!passwordRegex.test(formData.password)) {
                return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';
            }
            if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden';
        }

        if (!validRoles.includes(formData.role)) return 'Rol inválido';
        if (!['activo', 'inactivo'].includes(formData.status)) return 'Estado inválido';

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const validationError = validate();
            if (validationError) {
                setError(validationError);
                setLoading(false);
                return;
            }

            const emailToCheck = formData.email.trim().toLowerCase();
            const originalEmail = user?.email?.toLowerCase() || '';
            
            if (mode === 'add' || (mode === 'edit' && emailToCheck !== originalEmail)) {
                try {
                    const exists = await checkEmailExists(emailToCheck);
                    if (exists) {
                        setError('El email ya está registrado');
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    setError(err.message || 'Error verificando email');
                    setLoading(false);
                    return;
                }
            }

            const userData = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                role: formData.role,
                permissions: ['dashboard', 'personal'],
                status: formData.status
            };

            if (mode === 'add') {
                userData.password = formData.password;
            } else if (formData.password) {
                userData.password = formData.password;
            }

            const result = await onSubmit(userData, mode === 'add' ? 'create' : 'edit');

            if (result && result.success) {
                onClose();
            } else {
                setError(result?.error || 'Error al procesar la solicitud');
            }
        } catch (err) {
            setError('Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const getModalTitle = () => {
        switch (mode) {
            case 'add': return 'Nuevo Usuario';
            case 'edit': return 'Editar Usuario';
            case 'view': return 'Información del Usuario';
            default: return 'Usuario';
        }
    };

    if (!isOpen) return null;

    const isReadOnly = mode === 'view';

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            onClose();
                        }
                    }}
                >
                    <motion.div
                        className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ maxHeight: '90vh', margin: '2rem' }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b bg-white flex-shrink-0">
                            <div className="flex items-center gap-3">
                                {mode === 'view' && <User className="w-6 h-6 text-blue-600" />}
                                <h2 className="text-xl font-semibold">{getModalTitle()}</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {mode === 'view' ? (
                                <div className="p-6 space-y-6">
                                    {/* Avatar e información principal */}
                                    <div className="flex items-center justify-center space-x-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900">{user?.name || 'Usuario sin nombre'}</h3>
                                            <p className="text-gray-600">{user?.email || 'Sin email'}</p>
                                        </div>
                                    </div>

                                    {/* Grid de 2 columnas */}
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Columna izquierda */}
                                        <div className="space-y-4">
                                            {/* Rol */}
                                            <div className="bg-white p-4 border rounded-lg">
                                                <label className="block text-sm font-medium text-gray-500 mb-2">Rol del usuario</label>
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                                    <span className="text-lg font-medium text-gray-900">{getRoleName(user?.role)}</span>
                                                </div>
                                            </div>

                                            {/* Estado */}
                                            <div className="bg-white p-4 border rounded-lg">
                                                <label className="block text-sm font-medium text-gray-500 mb-2">Estado actual</label>
                                                <span className={getStatusClass(user?.status || 'inactivo')}>
                                                    {getStatusName(user?.status || 'inactivo')}
                                                </span>
                                            </div>

                                            {/* Información adicional */}
                                            <div className="bg-white p-4 border rounded-lg">
                                                <label className="block text-sm font-medium text-gray-500 mb-3">Información adicional</label>
                                                <div className="space-y-2 text-sm">
                                                    {user?.created_at && (
                                                        <div className="flex justify-between py-2 border-b">
                                                            <span className="text-gray-600">Registro:</span>
                                                            <span className="font-medium">{new Date(user.created_at).toLocaleString('es-ES')}</span>
                                                        </div>
                                                    )}
                                                    {user?.updated_at && (
                                                        <div className="flex justify-between py-2 border-b">
                                                            <span className="text-gray-600">Modificación:</span>
                                                            <span className="font-medium">{new Date(user.updated_at).toLocaleString('es-ES')}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between py-2">
                                                        <span className="text-gray-600">Último acceso:</span>
                                                        <span className="font-medium">
                                                            {user?.last_login ? new Date(user.last_login).toLocaleString('es-ES') : 'Nunca'}
                                                        </span>
                                                    </div>
                                                    {user?.id && (
                                                        <div className="flex justify-between py-2 border-t pt-2">
                                                            <span className="text-gray-600">ID:</span>
                                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user.id}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Columna derecha - Permisos */}
                                        <div className="bg-white p-4 border rounded-lg">
                                            <label className="block text-sm font-medium text-gray-500 mb-3">
                                                Permisos asignados ({user?.permissions?.length || 0})
                                            </label>
                                            {user?.permissions && user.permissions.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {user.permissions.map((permission, index) => (
                                                        <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                                            <span className="text-sm text-blue-800 font-medium">
                                                                {getPermissionName(permission)}
                                                            </span>
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

                                    {/* Footer */}
                                    <div className="pt-4">
                                        <button onClick={onClose} className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="p-6">
                                    {error && (
                                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
                                    )}

                                    {/* Grid de 2 columnas para el formulario */}
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        {/* Columna izquierda */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                    required
                                                    readOnly={isReadOnly}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    required
                                                    readOnly={isReadOnly}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                                                <select
                                                    value={formData.role}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                                    required
                                                    disabled={isReadOnly}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="user">Usuario</option>
                                                    <option value="admin">Administrador</option>
                                                    <option value="secretaria">Secretaria</option>
                                                    <option value="tesorero">Tesorero</option>
                                                    <option value="colaborador">Colaborador</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                                    disabled={isReadOnly}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="activo">Activo</option>
                                                    <option value="inactivo">Inactivo</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Columna derecha */}
                                        <div className="space-y-4">
                                            {!isReadOnly && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Contraseña {mode === 'add' ? '*' : '(dejar vacío para no cambiar)'}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'}
                                                                value={formData.password}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                                required={mode === 'add'}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                            >
                                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {(mode === 'add' || formData.password) && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
                                                            <div className="relative">
                                                                <input
                                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                                    value={formData.confirmPassword}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                                    required
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                                >
                                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                                                        <p className="text-sm text-blue-800">
                                                            <strong>Nota:</strong> Los nuevos usuarios tendrán acceso automático al Menú Principal y al módulo personal.
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex gap-3 pt-4 border-t">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {mode === 'add' ? 'Crear Usuario' : 'Guardar Cambios'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UserModal;