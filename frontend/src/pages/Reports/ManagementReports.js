import React, { useState, useEffect, useMemo } from 'react';
import { Church, Filter, ChevronDown, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import { useAuth } from '../../contexts/AuthContext';
import { ACTO_NOMBRES } from '../../constants/liturgical';

const ManagementReports = () => {
    const { authFetch } = useAuth();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        acto_nombre: '',
        parroquiaid: '',
        estado: '' // 'realizado' o 'pendiente'
    });
    const [parroquias, setParroquias] = useState([]);
    const [filtersVisible, setFiltersVisible] = useState(true);

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

                const url = `http://localhost:5000/api/liturgical/reports/celebrated-acts?${params.toString()}`;
                const response = await authFetch(url);

                if (response?.ok) {
                    const data = await response.json();
                    setReportData(data.items || []);
                }
            } catch (error) {
                console.error("Error fetching celebrated acts report data:", error);
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
        { key: 'h_fecha', header: 'Fecha', width: '15%', render: (item) => format(new Date(item.h_fecha), 'dd/MM/yyyy') },
        { key: 'h_hora', header: 'Hora', width: '10%', align: 'center' },
        { key: 'act_titulo', header: 'Tipo de Acto', width: '30%' },
        { key: 'par_nombre', header: 'Parroquia', width: '20%' },
        { key: 'asistentes', header: 'Asistentes', width: '10%', align: 'center' },
    ], []);

    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableColumns = ["Fecha", "Hora", "Tipo de Acto", "Parroquia", "Asistentes"];
        const tableRows = reportData.map(item => [
            format(new Date(item.h_fecha), 'dd/MM/yyyy'),
            item.h_hora,
            item.act_titulo,
            item.par_nombre,
            item.asistentes
        ]);

        doc.setFontSize(18);
        doc.text("Reporte de Actos Celebrados", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [3, 105, 161] },
        });

        doc.save(`reporte_actos_celebrados_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    // Cálculo de totales para el pie de tabla
    const tableFooter = useMemo(() => {
        const totalGeneral = reportData.length;
        const subtotales = reportData.reduce((acc, item) => {
            const tipo = ACTO_NOMBRES.find(a => a.value === item.act_nombre)?.label || item.act_nombre;
            acc[tipo] = (acc[tipo] || 0) + 1;
            return acc;
        }, {});

        return (
            <div className="p-4 bg-gray-50 border-t mt-4 rounded-b-lg">
                <h4 className="font-semibold text-md mb-2">Resumen de Actos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {Object.entries(subtotales).map(([tipo, total]) => (
                        <div key={tipo}>
                            <span className="text-gray-600">{tipo}:</span>
                            <span className="font-bold ml-2">{total}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <span className="text-lg font-bold">Total General de Actos:</span>
                    <span className="text-lg font-bold ml-2 text-blue-600">{totalGeneral}</span>
                </div>
            </div>
        );
    }, [reportData]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reporte de Actos Celebrados"
                subtitle="Listado de todos los actos litúrgicos realizados en un período"
                icon={Church}
            >
                <motion.button onClick={exportToPDF} className="text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}>
                    <FileText className="w-4 h-4" /> PDF
                </motion.button>
            </PageHeader>

            <Card>
                <div className="p-6">
                    <div className="mb-6">
                        <button onClick={() => setFiltersVisible(!filtersVisible)} className="flex items-center gap-2 text-lg font-semibold w-full text-left"><Filter className="w-5 h-5" /><h3>Filtros</h3><ChevronDown className={`w-5 h-5 ml-auto transition-transform ${filtersVisible ? 'rotate-180' : ''}`} /></button>
                        {filtersVisible && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} className="overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg" />
                                    <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg" />
                                    <select name="acto_nombre" value={filters.acto_nombre} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Tipo de Acto</option>{ACTO_NOMBRES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
                                    <select name="parroquiaid" value={filters.parroquiaid} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Parroquia</option>{parroquias.map(p => <option key={p.parroquiaid} value={p.parroquiaid}>{p.par_nombre}</option>)}</select>
                                    <select name="estado" value={filters.estado} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Estado</option><option value="realizado">Realizado</option><option value="pendiente">Pendiente</option></select>
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
                            rowKey="horarioid"
                            emptyText="No hay actos que coincidan con los filtros seleccionados."
                            loadingText="Cargando reporte de actos..."
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

export default ManagementReports;