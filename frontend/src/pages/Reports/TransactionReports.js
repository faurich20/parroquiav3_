import React, { useState, useEffect, useMemo } from 'react';
import { Users, Filter, ChevronDown, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInYears } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import { useAuth } from '../../contexts/AuthContext';

const TransactionReports = () => {
    const { authFetch } = useAuth();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        parroquiaid: '',
        distritoid: '',
        start_date: '',
        end_date: '',
        has_reservations: '' // 'yes', 'no', ''
    });
    const [parroquias, setParroquias] = useState([]);
    const [distritos, setDistritos] = useState([]);
    const [filtersVisible, setFiltersVisible] = useState(true);

    // Cargar parroquias y distritos para los filtros
    useEffect(() => {
        const loadFiltersData = async () => {
            try {
                const [parroquiasResp, distritosResp] = await Promise.all([
                    authFetch('http://localhost:5000/api/parroquias'),
                    authFetch('http://localhost:5000/api/distritos')
                ]);
                if (parroquiasResp?.ok) setParroquias((await parroquiasResp.json()).parroquias || []);
                if (distritosResp?.ok) setDistritos((await distritosResp.json()).distritos || []);
            } catch (err) {
                console.error('Error cargando datos para filtros:', err);
            }
        };
        loadFiltersData();
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

                const url = `http://localhost:5000/api/liturgical/reports/registered-parishioners?${params.toString()}`;
                const response = await authFetch(url);

                if (response?.ok) {
                    const data = await response.json();
                    setReportData(data.items || []);
                }
            } catch (error) {
                console.error("Error fetching parishioners report data:", error);
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
        { key: 'nombre_completo', header: 'Nombre Completo', width: '20%', render: (item) => `${item.per_nombres} ${item.per_apellidos}` },
        { key: 'edad', header: 'Edad', width: '10%', align: 'center', render: (item) => item.fecha_nacimiento ? `${differenceInYears(new Date(), new Date(item.fecha_nacimiento))} años` : '-' },
        { key: 'distrito', header: 'Distrito', width: '15%', render: (item) => item.dis_nombre },
        { key: 'parroquia', header: 'Parroquia', width: '15%', render: (item) => item.par_nombre },
        { key: 'telefono', header: 'Teléfono', width: '10%', render: (item) => item.per_telefono || '-' },
        { key: 'email', header: 'Email', width: '15%', render: (item) => item.email || '-' },
        { key: 'fecha_registro', header: 'Fecha Registro', width: '10%', render: (item) => format(new Date(item.fecha_registro), 'dd/MM/yyyy') },
        { key: 'reservas', header: 'N° Reservas', width: '5%', align: 'center', render: (item) => item.numero_reservas },
    ], []);

    const exportToPDF = () => {
        const doc = new jsPDF('landscape');
        const tableColumns = ["Nombre Completo", "Edad", "Distrito", "Parroquia", "Teléfono", "Email", "Fecha Registro", "N° Reservas"];
        const tableRows = reportData.map(item => [
            `${item.per_nombres} ${item.per_apellidos}`,
            item.fecha_nacimiento ? `${differenceInYears(new Date(), new Date(item.fecha_nacimiento))} años` : '-',
            item.dis_nombre || '-',
            item.par_nombre || '-',
            item.per_telefono || '-',
            item.email || '-',
            format(new Date(item.fecha_registro), 'dd/MM/yyyy'),
            item.numero_reservas
        ]);

        doc.setFontSize(18);
        doc.text("Reporte de Feligreses Registrados", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [3, 105, 161] },
            styles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 15 } }
        });

        doc.save(`reporte_feligreses_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    // Cálculo de totales para el pie de tabla
    const tableFooter = useMemo(() => {
        const totalGeneral = reportData.length;
        const subtotales = reportData.reduce((acc, item) => {
            acc[item.par_nombre] = (acc[item.par_nombre] || 0) + 1;
            return acc;
        }, {});

        return (
            <div className="p-4 bg-gray-50 border-t mt-4 rounded-b-lg">
                <h4 className="font-semibold text-md mb-2">Resumen de Feligreses</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {Object.entries(subtotales).map(([parroquia, total]) => (
                        <div key={parroquia}>
                            <span className="text-gray-600">{parroquia}:</span>
                            <span className="font-bold ml-2">{total}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <span className="text-lg font-bold">Total General de Feligreses:</span>
                    <span className="text-lg font-bold ml-2 text-blue-600">{totalGeneral}</span>
                </div>
            </div>
        );
    }, [reportData]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reporte de Feligreses Registrados"
                subtitle="Listado de todas las personas en el sistema"
                icon={Users}
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
                                    <select name="parroquiaid" value={filters.parroquiaid} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Parroquia</option>{parroquias.map(p => <option key={p.parroquiaid} value={p.parroquiaid}>{p.par_nombre}</option>)}</select>
                                    <select name="distritoid" value={filters.distritoid} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Distrito</option>{distritos.map(d => <option key={d.distritoid} value={d.distritoid}>{d.dis_nombre}</option>)}</select>
                                    <select name="has_reservations" value={filters.has_reservations} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Reservas</option><option value="yes">Con Reservas</option><option value="no">Sin Reservas</option></select>
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
                            rowKey="personaid"
                            emptyText="No hay feligreses que coincidan con los filtros seleccionados."
                            loadingText="Cargando reporte de feligreses..."
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

export default TransactionReports;