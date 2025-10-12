// parroquia-frontend/src/components/Modals/UserModal.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Loader, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ETIQUETAS_PERMISOS } from '../../constants/permissions';
import ModalBase from './ModalBase.js';
import SelectorRol from '../Form/SelectorRol.js';

const UserModal = ({ isOpen, mode, user, onClose, onSubmit }) => {

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        status: 'activo',
        per_nombres: '',
        per_apellidos: '',
        per_domicilio: '',
        per_telefono: '',
        fecha_nacimiento: '',
        parroquiaid: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rolesList, setRolesList] = useState([]);
    const [parroquias, setParroquias] = useState([]);
    const { authFetch } = useAuth();
    const formRef = useRef(null);

    const validRoles = ['admin', 'secretaria', 'tesorero', 'colaborador', 'user'];

    // Intenta verificar existencia de email usando distintos endpoints
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
            } catch (_) {
                // probar siguiente endpoint
            }
        }
        // Si no se pudo verificar, asumir que no existe y dejar que el backend valide al crear
        return false;
    };

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

    const getPermissionName = (permission) => {
        return ETIQUETAS_PERMISOS[permission] || permission;
    };

    const getStatusName = (status) => {
        const s = String(status || '').toLowerCase();
        return s === 'activo' || s === 'activo' ? 'Activo' : 'Inactivo';
    };

    const getStatusClass = (status) => {
        const s = String(status || '').toLowerCase();
        const base = 'px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ';
        return s === 'activo' ? base + 'bg-green-100 text-green-700' : base + 'bg-gray-100 text-gray-700';
    };

    // ModalBase maneja la clase del body y el portal

    useEffect(() => {
        const cargarRoles = async () => {
            try {
                const resp = await authFetch('http://localhost:5000/api/roles');
                if (!resp.ok) return;
                const data = await resp.json();
                const roles = Array.isArray(data.roles) ? data.roles : [];
                setRolesList(roles);
                // Si el rol actual no existe en catálogo, seleccionar el primero disponible
                const names = roles.map(r => r.name);
                if (roles.length && !names.includes((formData.role || '').trim())) {
                    setFormData(prev => ({ ...prev, role: roles[0].name }));
                }
            } catch (e) {
                // silencio: si falla, se usa fallback validRoles
            }
        };
        const cargarParroquias = async () => {
            try {
                const resp = await authFetch('http://localhost:5000/api/parroquias');
                if (!resp.ok) return;
                const data = await resp.json();
                const lista = Array.isArray(data.parroquias) ? data.parroquias : [];
                setParroquias(lista);
                // Autoseleccionar si solo hay una y no hay valor actual
                if (lista.length === 1 && !formData.parroquiaid) {
                    setFormData(prev => ({ ...prev, parroquiaid: String(lista[0].parroquiaid) }));
                }
            } catch (e) {
                // silencio
            }
        };
        if (isOpen) { cargarRoles(); cargarParroquias(); }
    }, [isOpen, authFetch]);

    useEffect(() => {
        if ((mode === 'edit' || mode === 'view') && user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                confirmPassword: '',
                role: user.role || 'user',
                status: user.status || 'activo',
                per_nombres: user.persona?.per_nombres || user.name || '',
                per_apellidos: user.persona?.per_apellidos || '',
                per_domicilio: user.persona?.per_domicilio || '',
                per_telefono: user.persona?.per_telefono || '',
                fecha_nacimiento: user.persona?.fecha_nacimiento || '',
                parroquiaid: user.persona?.parroquiaid || ''
            });
        } else {
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'user',
                status: 'activo',
                per_nombres: '',
                per_apellidos: '',
                per_domicilio: '',
                per_telefono: '',
                fecha_nacimiento: '',
                parroquiaid: ''
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

        const rolesValidos = rolesList.length ? rolesList.map(r => r.name) : validRoles;
        if (!rolesValidos.includes(formData.role)) return 'Rol inválido';

        // Estado fijo Activo por defecto: no se valida ni edita

        // Validaciones Persona (requeridos por el backend)
        if (mode === 'add') {
            if (!formData.per_nombres.trim()) return 'Los nombres de la persona son requeridos';
            if (!formData.per_apellidos.trim()) return 'Los apellidos de la persona son requeridos';
            if (!formData.fecha_nacimiento) return 'La fecha de nacimiento es requerida';
            if (!formData.parroquiaid) return 'La parroquia es requerida';
        }

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
                permissions: ['menu_principal', 'personal'],
                // status omitido: backend lo asume Activo
                persona: {
                    per_nombres: (formData.per_nombres || formData.name).trim(),
                    per_apellidos: (formData.per_apellidos || '').trim(),
                    per_domicilio: (formData.per_domicilio || '').trim(),
                    per_telefono: (formData.per_telefono || '').trim(),
                    fecha_nacimiento: formData.fecha_nacimiento || null,
                    parroquiaid: formData.parroquiaid ? Number(formData.parroquiaid) : null
                }
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

    const isReadOnly = mode === 'view';
    const footer = useMemo(() => {
        if (isReadOnly) {
            return (
                <button onClick={onClose} className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                    Cerrar
                </button>
            );
        }
        return (
            <div className="flex flex-col gap-2">
                {mode !== 'add' && (
                    <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                        Nota: Los usuarios tienen acceso automático al Menú Principal y al módulo personal.
                    </div>
                )}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-white hover:text-gray-900"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                            if (formRef.current) {
                                try { formRef.current.requestSubmit(); } catch { formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
                            }
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {mode === 'add' ? 'Crear Usuario' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        );
    }, [isReadOnly, onClose, loading, mode]);

    if (!isOpen) return null;

    return (
        <ModalBase
            isOpen={isOpen}
            title={getModalTitle()}
            icon={mode === 'view' ? User : undefined}
            onClose={onClose}
            closeOnOverlay={false}
            size="xl"
            footer={footer}
        >
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

                                </div>
                            ) : (
                                <form ref={formRef} onSubmit={handleSubmit} className="p-6">
                                    {error && (
                                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
                                    )}

                                    {/* Grid principal: datos de cuenta */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* Columna izquierda */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Nombre de usuario o alias *</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                    required
                                                    readOnly={isReadOnly}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Correo electrónico *</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    required
                                                    readOnly={isReadOnly}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Rol *</label>
                                                <SelectorRol
                                                    value={formData.role}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
                                                    disabled={isReadOnly}
                                                    className="text-gray-900"
                                                />
                                            </div>

                                            {/* Estado eliminado: siempre Activo por defecto */}
                                        </div>

                                        {/* Columna derecha */}
                                        <div className="space-y-4">
                                            {!isReadOnly && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-500 mb-1">
                                                            Contraseña {mode === 'add' ? '*' : '(dejar vacío para no cambiar)'}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'}
                                                                value={formData.password}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                                required={mode === 'add'}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900"
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
                                                            <label className="block text-sm font-medium text-gray-500 mb-1">Confirmar contraseña *</label>
                                                            <div className="relative">
                                                                <input
                                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                                    value={formData.confirmPassword}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                                    required
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900"
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

                                                    
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sección completa de Datos de Persona debajo para evitar espacios en blanco */}
                                    <div className="mt-2 p-4 rounded-lg border">
                                        <p className="font-medium mb-3 text-white">Datos de Persona</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Nombres *</label>
                                                <input
                                                    type="text"
                                                    value={formData.per_nombres}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, per_nombres: e.target.value }))}
                                                    required={mode === 'add'}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Apellidos *</label>
                                                <input
                                                    type="text"
                                                    value={formData.per_apellidos}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, per_apellidos: e.target.value }))}
                                                    required={mode === 'add'}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Fecha de nacimiento *</label>
                                                <input
                                                    type="date"
                                                    value={formData.fecha_nacimiento}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                                                    required={mode === 'add'}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Parroquia *</label>
                                                <select
                                                    value={formData.parroquiaid}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, parroquiaid: e.target.value }))}
                                                    required={mode === 'add'}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                >
                                                    <option value="">Seleccione una parroquia</option>
                                                    {parroquias.map(p => (
                                                        <option key={p.parroquiaid} value={p.parroquiaid}>{p.par_nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Domicilio</label>
                                                <input
                                                    type="text"
                                                    value={formData.per_domicilio}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, per_domicilio: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-500 mb-1">Teléfono</label>
                                                <input
                                                    type="text"
                                                    value={formData.per_telefono}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, per_telefono: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </form>
                            )}
            </div>
        </ModalBase>
    );
};

export default UserModal;