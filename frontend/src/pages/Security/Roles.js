import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Edit, Trash2, Loader, Search } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { useAuth } from '../../contexts/AuthContext';
import useCrud from '../../hooks/useCrud';
import ActionButton from '../../components/Common/ActionButton';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import ModalCrudGenerico from '../../components/Modals/ModalCrudGenerico.js';
import ListaPermisos from '../../components/Form/ListaPermisos.js';
import DialogoConfirmacion from '../../components/Common/DialogoConfirmacion';
import { buildActionColumn } from '../../components/Common/ActionColumn';

const RolesPage = () => {
    const { authFetch } = useAuth();

    const { items: roles, setItems, loading: cargando, error, createItem, updateItem, removeItem, updateStatus, list } = useCrud('http://localhost:5000/api/roles', { autoList: false });
    const [errorLocal, setErrorLocal] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoModal, setModoModal] = useState('crear'); // 'crear' | 'editar'
    const [rolSeleccionado, setRolSeleccionado] = useState(null);
    const [valoresIniciales, setValoresIniciales] = useState({ nombre: '', descripcion: '', permisos: [], estado: 'Activo' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const didSyncRef = useRef(false);
    const didListRef = useRef(false);

    useEffect(() => {
        if (!window.__rolesSyncUntil) window.__rolesSyncUntil = 0;
        if (!window.__rolesCache) window.__rolesCache = { value: null, expiry: 0 };
        if (!window.__rolesSyncInFlight) window.__rolesSyncInFlight = null;

        const syncYListar = async () => {
            try {
                const now = Date.now();
                // Sincronizar roles usados en usuarios antes de listar (TTL 2 min) con lock global
                if (!didSyncRef.current && window.__rolesSyncUntil <= now) {
                    console.log('[Roles] Sync requerido');
                    if (window.__rolesSyncInFlight) {
                        console.log('[Roles] Esperando sync en vuelo');
                        await window.__rolesSyncInFlight;
                    } else {
                        // Reservar ventana de sincronización antes del await para evitar carreras
                        window.__rolesSyncUntil = now + 120000;
                        window.__rolesSyncInFlight = authFetch('http://localhost:5000/api/roles/sync', { method: 'POST' });
                        try { await window.__rolesSyncInFlight; } finally { window.__rolesSyncInFlight = null; }
                    }
                    didSyncRef.current = true;
                }

                // Reusar cache si está vigente
                const cache = window.__rolesCache;
                const hasValidCache = cache && cache.expiry > now && Array.isArray(cache.value) && cache.value.length > 0;
                if (!didListRef.current && hasValidCache) {
                    console.log('[Roles] Cache HIT', cache.value.length);
                    setItems(cache.value);
                    didListRef.current = true;
                    return;
                }

                if (!didListRef.current) {
                    console.log('[Roles] Cache MISS -> GET /api/roles');
                    let listed = false;
                    try {
                        const resp = await authFetch('http://localhost:5000/api/roles', { method: 'GET' });
                        if (resp.ok) {
                            const data = await resp.json();
                            const rows = Array.isArray(data) ? data : (data.roles || []);
                            console.log('[Roles] Roles recibidos', rows.length);
                            setItems(rows);
                            if (rows.length > 0) {
                                window.__rolesCache = { value: rows, expiry: Date.now() + 60000 };
                            }
                            listed = true;
                        } else {
                            console.warn('[Roles] GET /api/roles no OK:', resp.status);
                        }
                    } catch (err) {
                        console.error('[Roles] Error GET /api/roles', err);
                    }
                    if (!listed) {
                        // Fallback al hook useCrud
                        console.log('[Roles] Fallback -> useCrud.list()');
                        try {
                            await list();
                            listed = true;
                        } catch (e) {
                            console.error('[Roles] Fallback list() error', e);
                        }
                    }
                    didListRef.current = listed;
                }
            } catch (e) {
                setErrorLocal(e.message || 'Error al cargar roles');
            }
        };
        syncYListar();
    }, [authFetch, setItems]);

    // Actualizar cache global cuando cambie roles realmente (evita cachear vacío antes de tiempo)
    useEffect(() => {
        if (!Array.isArray(roles) || roles.length === 0) return;
        console.log('[Roles] Actualizando cache con', roles.length);
        window.__rolesCache = { value: roles, expiry: Date.now() + 60000 };
    }, [roles]);

    const rolesFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return roles;
        return roles.filter(r =>
            r.name.toLowerCase().includes(q) ||
            (r.description || '').toLowerCase().includes(q)
        );
    }, [roles, busqueda]);

    const abrirCrear = () => {
        setModoModal('crear');
        setRolSeleccionado(null);
        setValoresIniciales({ nombre: '', descripcion: '', permisos: [], estado: 'Activo' });
        setModalAbierto(true);
    };

    const abrirEditar = (rol) => {
        setModoModal('editar');
        setRolSeleccionado(rol);
        const permisosNormalizados = Array.isArray(rol.permissions)
            ? rol.permissions.map((p) => {
                if (typeof p === 'string') return p;
                if (p && typeof p === 'object') return p.id || p.name || '';
                return '';
              }).filter(Boolean)
            : [];
        setValoresIniciales({
            nombre: rol.name || '',
            descripcion: rol.description || '',
            permisos: permisosNormalizados,
            estado: rol.status || 'Activo'
        });
        setModalAbierto(true);
    };

    const abrirVer = (rol) => {
        setModoModal('ver');
        setRolSeleccionado(rol);
        const permisosNormalizados = Array.isArray(rol.permissions)
            ? rol.permissions.map((p) => {
                if (typeof p === 'string') return p;
                if (p && typeof p === 'object') return p.id || p.name || '';
                return '';
              }).filter(Boolean)
            : [];
        setValoresIniciales({
            nombre: rol.name || '',
            descripcion: rol.description || '',
            permisos: permisosNormalizados,
            estado: rol.status || 'Activo'
        });
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setErrorLocal('');
    };

    const crearRol = async (vals) => {
        const payload = {
            name: vals.nombre,
            description: vals.descripcion,
            permissions: vals.permisos,
            status: vals.estado
        };
        const resp = await createItem(payload);
        return resp.success ? { success: true } : { success: false, error: resp.error };
    };

    const editarRol = async (vals) => {
        if (!rolSeleccionado) return { success: false, error: 'Rol no seleccionado' };
        const payload = {
            name: vals.nombre,
            description: vals.descripcion,
            permissions: vals.permisos,
            status: vals.estado
        };
        const resp = await updateItem(rolSeleccionado.id, payload);
        return resp.success ? { success: true } : { success: false, error: resp.error };
    };

    const solicitarEliminarRol = (rolId) => {
        setDeleteTarget(rolId);
        setConfirmOpen(true);
    };

    const confirmarEliminarRol = async () => {
        const rolId = deleteTarget;
        setConfirmOpen(false);
        setDeleteTarget(null);
        if (!rolId) return;
        const resp = await removeItem(rolId);
        if (!resp.success) alert(resp.error || 'Error al eliminar rol');
    };

    const cambiarEstado = async (rol) => {
        const nuevo = rol.status === 'Activo' ? 'Inactivo' : 'Activo';
        const resp = await updateStatus(rol.id, nuevo);
        if (!resp.success) alert(resp.error || 'Error al cambiar estado');
    };

    if (cargando) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando roles...</p>
                </div>
            </div>
        );
    }

    if (error || errorLocal) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center text-red-600">
                    <p>Error: {error || errorLocal}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Roles"
                subtitle="Administra los roles y permisos del sistema"
                icon={Shield}
            >
                <button
                    onClick={abrirCrear}
                    className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Rol
                </button>
            </PageHeader>

            <Card>
                {/* Buscador */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar roles..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl focus:ring-2 transition"
                            style={{
                                background: 'var(--surface-2)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)'
                            }}
                        />
                    </div>
                </div>
                {(() => {
                    const columns = [
                        { key: 'nombre', header: 'Nombre', width: '22%', render: (r) => r.name },
                        { key: 'descripcion', header: 'Descripción', width: '28%', render: (r) => (<span style={{ color: 'var(--muted)' }}>{r.description || '-'}</span>) },
                        { key: 'permisos', header: 'Permisos', width: '10%', align: 'center', render: (r) => (r.permissions || []).length },
                        {
                            key: 'estado', header: 'Estado', width: '10%', align: 'center', render: (r) => (
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${String(r.status).toLowerCase() === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {String(r.status).toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <button
                                        className={`px-2 py-1 rounded-lg text-white text-xs font-medium transition whitespace-nowrap ${r.status === 'Activo' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                                        onClick={() => cambiarEstado(r)}
                                    >
                                        {r.status === 'Activo' ? 'Dar Baja' : 'Dar Alta'}
                                    </button>
                                </div>
                            )
                        },
                        buildActionColumn({
                            onEdit: (row) => abrirEditar(row),
                            onDelete: (row) => solicitarEliminarRol(row.id),
                            onView: (row) => abrirVer(row),
                            width: '30%'
                        })
                    ];
                    return (
                        <TablaConPaginacion
                            columns={columns}
                            data={roles}
                            rowKey={(r) => r.id}
                            searchTerm={busqueda}
                            searchKeys={['name', 'description']}
                            itemsPerPage={7}
                            hover
                            striped
                            emptyText="Sin roles"
                        />
                    );
                })()}
            </Card>

            <ModalCrudGenerico
                isOpen={modalAbierto}
                mode={modoModal === 'crear' ? 'add' : (modoModal === 'editar' ? 'edit' : 'view')}
                title={modoModal === 'crear' ? 'Nuevo Rol' : (modoModal === 'editar' ? 'Editar Rol' : 'Información del Rol')}
                icon={Shield}
                initialValues={valoresIniciales}
                size="xl"
                validate={(vals) => {
                    if (!vals.nombre || !vals.nombre.trim()) return 'El nombre es requerido';
                    if (vals.nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres';
                    if (!['Activo', 'Inactivo'].includes(vals.estado)) return 'Estado inválido';
                    return null;
                }}
                fields={[
                    { name: 'nombre', label: 'Nombre *', type: 'text', placeholder: 'Ej: Admin' },
                    { name: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Describe el rol' },
                    {
                        name: 'permisos',
                        label: 'Permisos',
                        type: 'custom',
                        render: (value, setValue, form, disabled) => (
                            <div key="permisos">
                                <label className="block text-sm font-medium text-gray-500 mb-2">Permisos</label>
                                <ListaPermisos value={value || []} onChange={setValue} disabled={disabled} columnas={2} />
                            </div>
                        )
                    },
                    {
                        name: 'estado',
                        label: 'Estado',
                        type: 'select',
                        options: [
                            { value: 'Activo', label: 'Activo' },
                            { value: 'Inactivo', label: 'Inactivo' }
                        ]
                    }
                ]}
                readOnlyContent={(vals) => (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
                            <div className="font-medium" style={{ color: 'var(--text)' }}>{vals.nombre || '-'}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Descripción</label>
                            <div style={{ color: 'var(--text)' }}>{vals.descripcion || '-'}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Permisos</label>
                            <div className="text-sm" style={{ color: 'var(--muted)' }}>{(vals.permisos || []).length} permiso(s)</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${String(vals.estado).toLowerCase() === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {String(vals.estado).toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                )}
                onSubmit={(vals) => (modoModal === 'crear' ? crearRol(vals) : editarRol(vals))}
                onClose={cerrarModal}
            />

            {/* Diálogo de confirmación */}
            <DialogoConfirmacion
                abierto={confirmOpen}
                titulo="Eliminar rol"
                mensaje="¿Estás seguro de eliminar este rol? Esta acción no se puede deshacer."
                onConfirmar={confirmarEliminarRol}
                onCancelar={() => { setConfirmOpen(false); setDeleteTarget(null); }}
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default RolesPage;