import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Filter, Download, ChevronDown, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import { useAuth } from '../../contexts/AuthContext';
import useLiturgicalReservations from '../../hooks/useLiturgicalReservations';

const ReporteReserva = () => {
    const { authFetch, user } = useAuth();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedParroquia, setSelectedParroquia] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');
    const [selectedActo, setSelectedActo] = useState('');
    const [parroquias, setParroquias] = useState([]);
    const [filtersVisible, setFiltersVisible] = useState(true);

    // Título y subtítulo dinámicos según el rol
    const isUserRole = user?.role === 'Usuario';
    const isAdminRole = user?.role === 'Administrador';
    const pageTitle = isUserRole ? "Mis Reservas" : "Reporte de Reservas";
    const pageSubtitle = isUserRole ? "Consulta el historial de tus reservas" : "Análisis y estadísticas de reservas litúrgicas";

    // Determinar filtros según rol del usuario
    const userFilters = useMemo(() => {
        if (!user) return {};        
        const roleName = user?.role; // El rol es un string
        const personaId = user?.persona?.personaid;
        const parroquiaId = user?.persona?.parroquiaid;
        if (roleName === 'Usuario' && personaId) {
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
            if (dateRange.start && (!reserva.h_fecha || reserva.h_fecha < dateRange.start)) {
                return false;
            }
            if (dateRange.end && (!reserva.h_fecha || reserva.h_fecha > dateRange.end)) {
                return false;
            }

            // Filtro por parroquia
            if (selectedParroquia && (!reserva.parroquia_nombre || reserva.parroquia_nombre !== selectedParroquia)) {
                return false;
            }

            // Filtro por estado de pago
            if (selectedEstado && (!reserva.pago_estado || reserva.pago_estado !== selectedEstado)) {
                return false;
            }

            // Filtro por tipo de acto
            if (selectedActo && (!reserva.acto_nombre || reserva.acto_nombre !== selectedActo)) {
                return false;
            }

            return true;
        });
    }, [reservas, dateRange, selectedParroquia, selectedEstado, selectedActo]);

    // Obtener opciones únicas para filtros
    const actosUnicos = useMemo(() => {
        const actos = new Set(reservas?.map(r => r.acto_nombre).filter(Boolean) || []);
        return Array.from(actos).sort();
    }, [reservas]);

    const parroquiasUnicas = useMemo(() => {
        const parroquias = new Set(reservas?.map(r => r.parroquia_nombre).filter(Boolean) || []);
        return Array.from(parroquias).sort();
    }, [reservas]);

    // Definición de columnas para la tabla paginada
    const columns = useMemo(() => [
        {
            key: 'fecha_hora',
            header: 'Fecha y Hora',
            width: '15%',
            render: (r) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{r.h_fecha || '-'}</span>
                    <span className="text-xs text-gray-500">{r.h_hora || '-'}</span>
                </div>
            )
        },
        { key: 'persona_nombre', header: 'Persona', width: '20%' },
        { key: 'acto_nombre', header: 'Acto', width: '15%', render: (r) => <span className="capitalize">{r.acto_nombre}</span> },
        { key: 'parroquia_nombre', header: 'Parroquia', width: '15%' },
        {
            key: 'pago_estado',
            header: 'Estado',
            width: '10%',
            align: 'center',
            render: (r) => {
                const estado = r.pago_estado || 'pendiente';
                let bgColor = 'bg-gray-100 text-gray-700';
                let texto = 'Pendiente';

                if (estado === 'pagado') {
                    bgColor = 'bg-green-100 text-green-700';
                    texto = 'Pagado';
                } else if (estado === 'pendiente') {
                    bgColor = 'bg-yellow-100 text-yellow-700';
                    texto = 'Pendiente';
                }

                return (
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
                        {texto}
                    </span>
                );
            }
        },
        {
            key: 'pago_monto',
            header: 'Monto',
            width: '10%',
            align: 'right',
            render: (r) => (
                <span className="text-sm font-semibold text-gray-800">
                    {r.pago_monto != null ? `S/ ${Number(r.pago_monto).toFixed(2)}` : '-'}
                </span>
            )
        },
    ], []);

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

    // Función para exportar a PDF
    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableColumns = ["Fecha", "Hora", "Persona", "Acto", "Parroquia", "Estado", "Monto"];
        const tableRows = [];

        filteredReservas.forEach(reserva => {
            const reservaData = [
                reserva.h_fecha || '-',
                reserva.h_hora || '-',
                reserva.persona_nombre || '-',
                reserva.acto_nombre || '-',
                reserva.parroquia_nombre || '-',
                reserva.pago_estado || 'pendiente',
                reserva.pago_monto != null ? `S/ ${Number(reserva.pago_monto).toFixed(2)}` : '-'
            ];
            tableRows.push(reservaData);
        });

        // Título del documento
        doc.setFontSize(18);
        doc.text(pageTitle, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        // Añadir la tabla
        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 35,
            headStyles: {
                fillColor: [3, 105, 161], // Un azul oscuro (puedes usar tu var(--primary))
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [241, 245, 249] // Un gris muy claro para filas alternas
            },
            didDrawPage: function (data) {
                // Pie de página con número
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(10);
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

        doc.save(`reporte_reservas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
                title={pageTitle}
                subtitle={pageSubtitle}
                icon={BarChart3}
            >
                <div className="flex gap-2">
                    <motion.button
                        onClick={exportToCSV}
                        className="bg-gray-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:bg-gray-700"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </motion.button>
                    <motion.button
                        onClick={exportToPDF}
                        className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FileText className="w-4 h-4" />
                        PDF
                    </motion.button>
                </div>
            </PageHeader>

            {/* Filtros */}
            <Card>
                <div className="p-6">
                    <div className="mb-6">
                        <button
                            onClick={() => setFiltersVisible(!filtersVisible)}
                            className="flex items-center gap-2 text-lg font-semibold w-full text-left"
                            style={{ color: 'var(--text)' }}
                        >
                            <Filter className="w-5 h-5 text-gray-600" />
                            <h3>Filtros</h3>
                            <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${filtersVisible ? 'rotate-180' : ''}`} />
                        </button>
                        {filtersVisible && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                className="overflow-hidden"
                            >
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
                                    {isAdminRole && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Parroquia</label>
                                            <select value={selectedParroquia} onChange={(e) => setSelectedParroquia(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                                                <option value="">Todas</option>
                                                {parroquiasUnicas.map(p => (<option key={p} value={p}>{p}</option>))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Estado Pago</label>
                                        <select value={selectedEstado} onChange={(e) => setSelectedEstado(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                                            <option value="">Todos</option>
                                            <option value="pagado">Pagado</option>
                                            <option value="pendiente">Pendiente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Acto Litúrgico</label>
                                        <select value={selectedActo} onChange={(e) => setSelectedActo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                                            <option value="">Todos</option>
                                            {actosUnicos.map(a => (<option key={a} value={a}>{a}</option>))}
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Tabla detallada */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                            Detalle de Reservas ({filteredReservas.length})
                        </h3>
                        <TablaConPaginacion
                            columns={columns}
                            data={filteredReservas}
                            rowKey={(r) => r.reservaid}
                            emptyText="No hay reservas que coincidan con los filtros seleccionados."
                            headerSticky
                            striped
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReporteReserva;
