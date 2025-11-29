import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Filter, Download, FileText, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import { useAuth } from '../../contexts/AuthContext';
import { ACTO_NOMBRES } from '../../constants/liturgical';

const FinancialReport = () => {
    const { authFetch } = useAuth();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        year: '2025', // Año 2025 por defecto
        month: '', // Todos los meses por defecto
        pago_medio: '',
        pago_estado: '',
        parroquiaid: '',
        acto_nombre: ''
    });
    const [parroquias, setParroquias] = useState([]);
    const [filtersVisible, setFiltersVisible] = useState(true);

    // Opciones para los filtros de año y mes
    const yearOptions = useMemo(() => {
        const currentYear = 2025; // Año base del sistema
        const years = [];
        for (let i = currentYear; i >= currentYear - 5; i--) { // Mostrar solo los últimos 5 años + el actual
            years.push(i);
        }
        return years;
    }, []);

    const monthOptions = [
        { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
        { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
        { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
        { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
    ];

    // Cargar parroquias para el filtro
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

    // Cargar datos del reporte
    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                    if (value) params.append(key, value);
                });

                const url = `http://localhost:5000/api/liturgical/reports/financial?${params.toString()}`;
                const response = await authFetch(url);

                if (response?.ok) {
                    const data = await response.json();
                    setReportData(data.items || []);
                }
            } catch (error) {
                console.error("Error fetching financial report data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [authFetch, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const columns = useMemo(() => [
        { key: 'pago_fecha', header: 'Fecha Pago', width: '15%', render: (item) => format(new Date(item.pago_fecha), 'dd/MM/yyyy HH:mm') },
        { key: 'act_titulo', header: 'Acto Litúrgico', width: '20%' },
        { key: 'par_nombre', header: 'Parroquia', width: '15%' },
        { key: 'pago_medio', header: 'Método', width: '10%', align: 'center' },
        { key: 'pago_monto', header: 'Monto (S/)', width: '10%', align: 'right', render: (item) => `S/ ${Number(item.pago_monto || 0).toFixed(2)}` },
        { key: 'pago_estado', header: 'Estado', width: '10%', align: 'center', render: (item) => <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.pago_estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.pago_estado}</span> },
        { key: 'persona_reserva', header: 'Persona/Reserva', width: '20%' },
    ], []);

    // Cálculo de totales para el pie de tabla
    const tableFooter = useMemo(() => {
        const totalGeneral = reportData.reduce((acc, item) => acc + (item.pago_estado === 'pagado' ? item.pago_monto : 0), 0);
        const subtotales = reportData.reduce((acc, item) => {
            if (item.pago_estado === 'pagado') {
                acc[item.pago_medio] = (acc[item.pago_medio] || 0) + item.pago_monto;
            }
            return acc;
        }, {});

        return (
            <div className="p-4 bg-gray-50 border-t mt-4 rounded-b-lg">
                <h4 className="font-semibold text-md mb-2">Resumen Financiero (Pagado)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {Object.entries(subtotales).map(([medio, monto]) => (
                        <div key={medio}>
                            <span className="text-gray-600">{medio}:</span>
                            <span className="font-bold ml-2">S/ {monto.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <span className="text-lg font-bold">Total General Recaudado:</span>
                    <span className="text-lg font-bold ml-2 text-green-600">S/ {totalGeneral.toFixed(2)}</span>
                </div>
            </div>
        );
    }, [reportData]);

    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableColumns = ["Fecha", "Acto", "Parroquia", "Método", "Monto", "Estado", "Persona"];
        const tableRows = reportData.map(item => [
            format(new Date(item.pago_fecha), 'dd/MM/yyyy HH:mm'),
            item.act_titulo || '-',
            item.par_nombre || '-',
            item.pago_medio || '-',
            `S/ ${Number(item.pago_monto || 0).toFixed(2)}`,
            item.pago_estado || '-',
            item.persona_reserva || '-'
        ]);

        doc.setFontSize(18);
        doc.text("Reporte de Ingresos Recaudados", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 35,
            didDrawPage: (data) => {
                // Pie de página con número
                doc.setFontSize(10);
                doc.text(`Página ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

        // Añadir totales al final
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text("Resumen Financiero:", 14, finalY);
        let currentY = finalY + 7;
        const subtotales = reportData.reduce((acc, item) => {
            if (item.pago_estado === 'pagado') acc[item.pago_medio] = (acc[item.pago_medio] || 0) + item.pago_monto;
            return acc;
        }, {});
        Object.entries(subtotales).forEach(([medio, monto]) => {
            doc.text(`${medio}: S/ ${monto.toFixed(2)}`, 14, currentY);
            currentY += 7;
        });
        const totalGeneral = reportData.reduce((acc, item) => acc + (item.pago_estado === 'pagado' ? item.pago_monto : 0), 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total General Recaudado: S/ ${totalGeneral.toFixed(2)}`, 14, currentY + 3);

        doc.save(`reporte_financiero_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Reporte de Ingresos Recaudados" subtitle="Detalle financiero de todos los pagos recibidos" icon={DollarSign}>
                <motion.button onClick={exportToPDF} className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}><FileText className="w-4 h-4" /> PDF</motion.button>
            </PageHeader>

            <Card>
                <div className="p-6">
                    <div className="mb-6">
                        <button onClick={() => setFiltersVisible(!filtersVisible)} className="flex items-center gap-2 text-lg font-semibold w-full text-left"><Filter className="w-5 h-5" /><h3>Filtros</h3><ChevronDown className={`w-5 h-5 ml-auto transition-transform ${filtersVisible ? 'rotate-180' : ''}`} /></button>
                        {filtersVisible && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} className="overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {/* Filtro por Año */}
                                    <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Todo el Año</option>{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select>
                                    
                                    {/* Filtro por Mes */}
                                    <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Todo el Mes</option>{monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>

                                    <select name="pago_medio" value={filters.pago_medio} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Método de Pago</option><option value="Yape o Plin">Yape o Plin</option><option value="Tarjeta">Tarjeta</option><option value="Efectivo">Efectivo</option></select>
                                    <select name="pago_estado" value={filters.pago_estado} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Estado</option><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="vencido">Vencido</option></select>
                                    <select name="parroquiaid" value={filters.parroquiaid} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Parroquia</option>{parroquias.map(p => <option key={p.parroquiaid} value={p.parroquiaid}>{p.par_nombre}</option>)}</select>
                                    <select name="acto_nombre" value={filters.acto_nombre} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Tipo de Acto</option>{ACTO_NOMBRES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-4">Resultados ({reportData.length})</h3>
                        <TablaConPaginacion
                            columns={columns}
                            data={reportData}
                            loading={loading}
                            rowKey="pagoid"
                            emptyText="No hay datos de pagos para los filtros seleccionados."
                            loadingText="Cargando reporte financiero..."
                            headerSticky
                            striped
                        />
                        {reportData.length > 0 && tableFooter}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default FinancialReport;