import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Calendar, DollarSign, Users, Filter, Download, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { useAuth } from '../../contexts/AuthContext';
import useLiturgicalReservations from '../../hooks/useLiturgicalReservations';

const Reporte1 = () => {
    const { authFetch, user } = useAuth();
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });
    const [selectedParroquia, setSelectedParroquia] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');
    const [selectedActo, setSelectedActo] = useState('');
    const [parroquias, setParroquias] = useState([]);

    // Determinar filtros según rol del usuario
    const userFilters = useMemo(() => {
        if (!user) return {};
        const roleName = user.role?.rol_nombre;
        const personaId = user.persona?.personaid;
        const parroquiaId = user.persona?.parroquiaid;

        if (roleName === 'Usuario') {
            return { personaid: personaId };
        }
        if (roleName !== 'Administrador' && parroquiaId) {
            return { parroquiaid: parroquiaId };
        }
        return {};
    }, [user]);

    const { items: reservas, loading } = useLiturgicalReservations({
        autoList: true,
        filters: userFilters
    });

    // Cargar parroquias
    useEffect(() => {
        const loadParroquias = async () => {
            try {
                const resp = await authFetch('http://localhost:5000/api/parroquias');
                if (resp?.ok) {
                    const data = await resp.json();
                    setParroquias(data.parroquias || []);
                }
            } catch (err) {
                console.error('Error cargando parroquias:', err);
            }
        };
        loadParroquias();
    }, [authFetch]);

    // Filtrar reservas según criterios seleccionados
    const filteredReservas = useMemo(() => {
        if (!reservas) return [];

        return reservas.filter(reserva => {
            // Filtro por rango de fechas
            if (dateRange.start && reserva.h_fecha) {
                if (reserva.h_fecha < dateRange.start) return false;
            }
            if (dateRange.end && reserva.h_fecha) {
                if (reserva.h_fecha > dateRange.end) return false;
            }

            // Filtro por parroquia
            if (selectedParroquia && reserva.parroquia_nombre !== selectedParroquia) {
                return false;
            }

            // Filtro por estado de pago
            if (selectedEstado && reserva.pago_estado !== selectedEstado) {
                return false;
            }

            // Filtro por tipo de acto
            if (selectedActo && reserva.acto_nombre !== selectedActo) {
                return false;
            }

            return true;
        });
    }, [reservas, dateRange, selectedParroquia, selectedEstado, selectedActo]);

    // Calcular estadísticas
    const stats = useMemo(() => {
        const total = filteredReservas.length;
        const pagadas = filteredReservas.filter(r => r.pago_estado === 'pagado').length;
        const pendientes = filteredReservas.filter(r => r.pago_estado === 'pendiente').length;

        // Agrupar por parroquia
        const porParroquia = filteredReservas.reduce((acc, r) => {
            const parroquia = r.parroquia_nombre || 'Sin parroquia';
            acc[parroquia] = (acc[parroquia] || 0) + 1;
            return acc;
        }, {});

        // Agrupar por acto litúrgico
        const porActo = filteredReservas.reduce((acc, r) => {
            const acto = r.acto_nombre || 'Sin acto';
            acc[acto] = (acc[acto] || 0) + 1;
            return acc;
        }, {});

        // Agrupar por fecha
        const porFecha = filteredReservas.reduce((acc, r) => {
            if (r.h_fecha) {
                const fecha = r.h_fecha;
                acc[fecha] = (acc[fecha] || 0) + 1;
            }
            return acc;
        }, {});

        return {
            total,
            pagadas,
            pendientes,
            porParroquia,
            porActo,
            porFecha
        };
    }, [filteredReservas]);

    // Obtener opciones únicas para filtros
    const actosUnicos = useMemo(() => {
        const actos = new Set(reservas?.map(r => r.acto_nombre).filter(Boolean) || []);
        return Array.from(actos).sort();
    }, [reservas]);

    const parroquiasUnicas = useMemo(() => {
        const parroquias = new Set(reservas?.map(r => r.parroquia_nombre).filter(Boolean) || []);
        return Array.from(parroquias).sort();
    }, [reservas]);

    // Función para exportar a CSV
    const exportToCSV = () => {
        const headers = ['Fecha', 'Hora', 'Persona', 'Acto', 'Parroquia', 'Estado Pago', 'Descripción'];
        const rows = filteredReservas.map(r => [
            r.h_fecha || '',
            r.h_hora || '',
            r.persona_nombre || '',
            r.acto_nombre || '',
            r.parroquia_nombre || '',
            r.pago_estado || '',
            r.res_descripcion || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_reservas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando reporte...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reporte de Reservas"
                subtitle="Análisis y estadísticas de reservas litúrgicas"
                icon={BarChart3}
            >
                <motion.button
                    onClick={exportToCSV}
                    className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                </motion.button>
            </PageHeader>

            {/* Filtros */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Filtros</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Fecha Inicio</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Fecha Fin</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Parroquia</label>
                            <select
                                value={selectedParroquia}
                                onChange={(e) => setSelectedParroquia(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                            >
                                <option value="">Todas</option>
                                {parroquiasUnicas.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Estado Pago</label>
                            <select
                                value={selectedEstado}
                                onChange={(e) => setSelectedEstado(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                            >
                                <option value="">Todos</option>
                                <option value="pagado">Pagado</option>
                                <option value="pendiente">Pendiente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Acto Litúrgico</label>
                            <select
                                value={selectedActo}
                                onChange={(e) => setSelectedActo(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                            >
                                <option value="">Todos</option>
                                {actosUnicos.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Reservas</p>
                                    <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text)' }}>
                                        {stats.total}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                                    <Calendar className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pagadas</p>
                                    <p className="text-3xl font-bold mt-2 text-green-600">
                                        {stats.pagadas}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {stats.total > 0 ? Math.round((stats.pagadas / stats.total) * 100) : 0}% del total
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pendientes</p>
                                    <p className="text-3xl font-bold mt-2 text-yellow-600">
                                        {stats.pendientes}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {stats.total > 0 ? Math.round((stats.pendientes / stats.total) * 100) : 0}% del total
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100">
                                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reservas por Parroquia */}
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                            Reservas por Parroquia
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(stats.porParroquia)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([parroquia, count]) => {
                                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={parroquia}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium" style={{ color: 'var(--text)' }}>
                                                    {parroquia}
                                                </span>
                                                <span className="text-gray-600">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </Card>

                {/* Reservas por Acto Litúrgico */}
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                            Reservas por Acto Litúrgico
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(stats.porActo)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([acto, count]) => {
                                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={acto}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium capitalize" style={{ color: 'var(--text)' }}>
                                                    {acto}
                                                </span>
                                                <span className="text-gray-600">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full bg-blue-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabla detallada */}
            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                        Detalle de Reservas ({filteredReservas.length})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>Fecha</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>Hora</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>Persona</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>Acto</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>Parroquia</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text)' }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReservas.slice(0, 50).map((reserva, idx) => (
                                    <tr
                                        key={reserva.reservaid || idx}
                                        className="border-b hover:bg-gray-50 transition-colors"
                                        style={{ borderColor: 'var(--border)' }}
                                    >
                                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                                            {reserva.h_fecha || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                                            {reserva.h_hora || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                                            {reserva.persona_nombre || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm capitalize" style={{ color: 'var(--text)' }}>
                                            {reserva.acto_nombre || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                                            {reserva.parroquia_nombre || '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${reserva.pago_estado === 'pagado'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                    }`}
                                            >
                                                {reserva.pago_estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredReservas.length > 50 && (
                            <p className="text-center text-sm text-gray-500 mt-4">
                                Mostrando 50 de {filteredReservas.length} reservas. Usa los filtros para refinar la búsqueda.
                            </p>
                        )}
                        {filteredReservas.length === 0 && (
                            <p className="text-center text-gray-500 py-8">
                                No hay reservas que coincidan con los filtros seleccionados.
                            </p>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Reporte1;
