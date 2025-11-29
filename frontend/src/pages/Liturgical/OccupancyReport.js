import React, { useState, useEffect, useMemo } from 'react';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import TablaConPaginacion from '../../components/Common/TablaConPaginacion';
import { useAuth } from '../../contexts/AuthContext';

const OccupancyReport = () => {
    const { authFetch } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOccupancyData = async () => {
            try {
                setLoading(true);
                // Usar el nuevo endpoint dedicado para este reporte
                const response = await authFetch('http://localhost:5000/api/liturgical/reports/occupancy');
                if (response?.ok) {
                    const data = await response.json();
                    setEvents(data.items || []);
                }
            } catch (error) {
                console.error("Error fetching occupancy data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOccupancyData();
    }, [authFetch]);

    const columns = useMemo(() => [
        {
            key: 'evento',
            header: 'Evento',
            width: '35%',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{item.titulo}</span>
                    <span className="text-xs text-gray-500">{item.parroquia_nombre}</span>
                </div>
            )
        },
        {
            key: 'fecha',
            header: 'Fecha y Hora',
            width: '20%',
            render: (item) => format(new Date(`${item.fecha}T${item.hora}`), "d MMM yyyy, HH:mm", { locale: es })
        },
        {
            key: 'ocupacion',
            header: 'Ocupación',
            width: '30%',
            render: (item) => {
                const max = item.max_reservas;
                const current = item.reservas_count;

                if (max === null || max === 0) {
                    return <span className="text-sm text-gray-500">Sin límite ({current} inscritos)</span>;
                }

                const percentage = (current / max) * 100;
                let barColor = 'bg-blue-500';
                if (percentage > 70) barColor = 'bg-yellow-500';
                if (percentage >= 95) barColor = 'bg-red-500';

                return (
                    <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 min-w-[70px] text-right">{current} / {max}</span>
                    </div>
                );
            }
        },
        {
            key: 'disponibles',
            header: 'Disponibles',
            width: '15%',
            align: 'center',
            render: (item) => {
                const max = item.max_reservas;
                const current = item.reservas_count;
                const disponibles = max !== null ? max - current : '∞';
                return <span className="font-semibold text-lg">{disponibles}</span>;
            }
        }
    ], []);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reporte de Ocupación de Cupos"
                subtitle="Visualiza la capacidad y disponibilidad de los próximos actos litúrgicos."
                icon={Users}
            />

            <Card>
                <div className="p-6">
                    <TablaConPaginacion
                        columns={columns}
                        data={events}
                        loading={loading}
                        rowKey={(item) => item.horarioid}
                        emptyText="No hay eventos programados a futuro."
                        loadingText="Cargando ocupación de eventos..."
                        headerSticky
                    />
                </div>
            </Card>
        </div>
    );
};

export default OccupancyReport;