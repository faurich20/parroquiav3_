import React, { useState, useEffect, useMemo } from 'react';
import { Building, BarChart3, Filter, Download, FileText, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import { useAuth } from '../../contexts/AuthContext';

const ParishActivityReport = () => {
    const { authFetch } = useAuth();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Sin valores por defecto - empieza sin filtros
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [filtersVisible, setFiltersVisible] = useState(true);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                
                if (dateRange.start) {
                    params.append('start_date', dateRange.start);
                    console.log('📅 Fecha inicio:', dateRange.start);
                }
                if (dateRange.end) {
                    params.append('end_date', dateRange.end);
                    console.log('📅 Fecha fin:', dateRange.end);
                }

                const url = `http://localhost:5000/api/liturgical/reports/parish-activity?${params.toString()}`;
                console.log('🔍 URL generada:', url);
                
                const response = await authFetch(url);

                if (response?.ok) {
                    const data = await response.json();
                    console.log('✅ Datos recibidos:', data.items?.length, 'filas');
                    setReportData(data.items || []);
                } else {
                    console.error('❌ Error en respuesta:', response?.status);
                }
            } catch (error) {
                console.error("❌ Error fetching parish activity data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [authFetch, dateRange]);

    const columns = useMemo(() => [
        {
            key: 'parroquia_nombre',
            header: 'Parroquia',
            width: '40%',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-800">{item.parroquia_nombre}</span>
                </div>
            )
        },
        { key: 'total_eventos', header: 'Eventos', width: '15%', align: 'center' },
        { key: 'total_reservas', header: 'Reservas', width: '15%', align: 'center' },
        {
            key: 'ingresos_totales',
            header: 'Ingresos (S/)',
            width: '20%',
            align: 'right',
            render: (item) => `S/ ${Number(item.ingresos_totales || 0).toFixed(2)}`
        },
    ], []);

    const clearFilters = () => {
        setDateRange({ start: '', end: '' });
    };

    const exportToCSV = () => {
        const headers = ['Parroquia', 'Total Eventos', 'Total Reservas', 'Ingresos Totales (S/)'];
        const rows = reportData.map(item => [
            `"${item.parroquia_nombre}"`,
            item.total_eventos,
            item.total_reservas,
            Number(item.ingresos_totales || 0).toFixed(2)
        ]);

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_actividad_parroquias_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableColumns = ["Parroquia", "Eventos", "Reservas", "Ingresos (S/)"];
        const tableRows = reportData.map(item => [
            item.parroquia_nombre,
            item.total_eventos,
            item.total_reservas,
            `S/ ${Number(item.ingresos_totales || 0).toFixed(2)}`
        ]);

        doc.setFontSize(18);
        doc.text("Reporte de Actividad por Parroquia", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        
        const dateRangeText = dateRange.start && dateRange.end 
            ? `Período: ${format(new Date(dateRange.start), 'dd/MM/yyyy')} - ${format(new Date(dateRange.end), 'dd/MM/yyyy')}`
            : 'Período: Todos los registros';
        doc.text(dateRangeText, 14, 30);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 36);

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 42,
            headStyles: { fillColor: [3, 105, 161] },
        });

        doc.save(`reporte_actividad_parroquias_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reporte de Actividad por Parroquia"
                subtitle="Resumen de eventos, reservas e ingresos por cada parroquia."
                icon={BarChart3}
            >
                <div className="flex gap-2">
                    <motion.button 
                        onClick={exportToCSV} 
                        className="bg-gray-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:bg-gray-700"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Download className="w-4 h-4" /> CSV
                    </motion.button>
                    <motion.button 
                        onClick={exportToPDF} 
                        className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all" 
                        style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FileText className="w-4 h-4" /> PDF
                    </motion.button>
                </div>
            </PageHeader>

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
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} 
                                exit={{ height: 0, opacity: 0 }} 
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">
                                            Fecha Inicio
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">
                                            Fecha Fin
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-4">
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                                
                                {(dateRange.start || dateRange.end) && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-800">
                                            <strong>Período seleccionado:</strong>{' '}
                                            {dateRange.start ? format(new Date(dateRange.start), 'dd/MM/yyyy') : '---'} 
                                            {' → '}
                                            {dateRange.end ? format(new Date(dateRange.end), 'dd/MM/yyyy') : '---'}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                            Resultados ({reportData.length})
                        </h3>
                        <TablaConPaginacion
                            columns={columns}
                            data={reportData}
                            loading={loading}
                            rowKey="parroquiaid"
                            emptyText="No hay datos de actividad para los filtros seleccionados."
                            loadingText="Cargando reporte de actividad..."
                            headerSticky
                            striped
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ParishActivityReport;