import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    Users, Calendar, DollarSign, TrendingUp, 
    Church, Clock, FileText, AlertCircle 
} from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Dashboard = () => {
    const { authFetch } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentActivities, setRecentActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch para estadísticas
                const statsResp = await authFetch('http://localhost:5000/api/liturgical/dashboard-stats');
                if (statsResp?.ok) {
                    const statsData = await statsResp.json();
                    setStats(statsData.stats);
                }

                // Fetch para actividades recientes (usando el endpoint del calendario)
                const activitiesResp = await authFetch('http://localhost:5000/api/liturgical/calendario');
                if (activitiesResp?.ok) {
                    const activitiesData = await activitiesResp.json();
                    // Tomar los próximos 5 eventos
                    const proximosEventos = (activitiesData.items || [])
                        .filter(item => new Date(item.date) >= new Date())
                        .slice(0, 5);
                    setRecentActivities(proximosEventos);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [authFetch]);

    const statCards = [
        {
            title: 'Miembros Activos',
            value: stats?.miembros_activos?.toLocaleString('es-PE') || '0',
            icon: Users,
            color: 'from-blue-500 to-blue-600'
        },
        {
            title: 'Eventos Este Mes',
            value: stats?.eventos_este_mes?.toLocaleString('es-PE') || '0',
            icon: Calendar,
            color: 'from-green-500 to-green-600'
        },
        {
            title: 'Total de Reservas',
            value: stats?.total_reservas?.toLocaleString('es-PE') || '0',
            icon: TrendingUp,
            color: 'from-orange-500 to-orange-600'
        },
        {
            title: 'Ingresos Totales',
            value: `S/ ${stats?.ingresos_totales?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
            icon: DollarSign,
            color: 'from-purple-500 to-purple-600'
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard"
                subtitle="Resumen general del sistema parroquial"
                icon={Church}
            />

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value || '...'}</p>
                                </div>
                                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Actividades Recientes */}
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Actividades Recientes</h3>
                        {/* CORRECCIÓN: Usar Link con la ruta correcta */}
                        <Link to="/liturgical/horarios" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Ver todas
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentActivities.map((activity) => (
                            <div key={activity.horarioid} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Church className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{activity.title}</p>
                                    <p className="text-sm text-gray-500">
                                        {format(new Date(activity.date), 'd MMM yyyy', { locale: es })} - {activity.time}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                    activity.reservas_count > 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {activity.reservas_count > 0 ? `${activity.reservas_count} Reservas` : 'Programada'}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Alertas y Notificaciones */}
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Alertas y Notificaciones</h3>
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <div>
                                    <p className="font-medium text-red-900">Pago Pendiente</p>
                                    <p className="text-sm text-red-700">Factura de servicios vence mañana</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-yellow-500" />
                                <div>
                                    <p className="font-medium text-yellow-900">Recordatorio</p>
                                    <p className="text-sm text-yellow-700">Reunión del consejo en 2 horas</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <div>
                                    <p className="font-medium text-blue-900">Nuevo Reporte</p>
                                    <p className="text-sm text-blue-700">Reporte mensual disponible</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;