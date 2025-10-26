//import React from 'react';
import { motion } from 'framer-motion';
import { 
    Users, Calendar, DollarSign, TrendingUp, 
    Church, Clock, FileText, AlertCircle 
} from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';

const Dashboard = () => {
    const stats = [
        {
            title: 'Miembros Activos',
            value: '1,247',
            change: '+12%',
            icon: Users,
            color: 'from-blue-500 to-blue-600'
        },
        {
            title: 'Eventos Este Mes',
            value: '23',
            change: '+5%',
            icon: Calendar,
            color: 'from-green-500 to-green-600'
        },
        {
            title: 'Ingresos Mensuales',
            value: '$15,420',
            change: '+8%',
            icon: DollarSign,
            color: 'from-purple-500 to-purple-600'
        },
        {
            title: 'Donaciones',
            value: '$8,750',
            change: '+15%',
            icon: TrendingUp,
            color: 'from-orange-500 to-orange-600'
        }
    ];

    const recentActivities = [
        {
            id: 1,
            type: 'Misa',
            title: 'Misa Dominical',
            time: '10:00 AM',
            date: 'Hoy',
            status: 'programada'
        },
        {
            id: 2,
            type: 'Bautismo',
            title: 'Bautismo - Familia García',
            time: '2:00 PM',
            date: 'Mañana',
            status: 'confirmada'
        },
        {
            id: 3,
            type: 'Reunión',
            title: 'Consejo Parroquial',
            time: '7:00 PM',
            date: '15 Ene',
            status: 'pendiente'
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard"
                subtitle="Resumen general del sistema parroquial"
                icon={Church}
            />

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
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
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                    <p className="text-sm text-green-600 mt-1">{stat.change} vs mes anterior</p>
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
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Ver todas
                        </button>
                    </div>
                    <div className="space-y-4">
                        {recentActivities.map((activity) => (
                            <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Church className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{activity.title}</p>
                                    <p className="text-sm text-gray-500">{activity.date} - {activity.time}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                    activity.status === 'programada' ? 'bg-blue-100 text-blue-700' :
                                    activity.status === 'confirmada' ? 'bg-green-100 text-green-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {activity.status}
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