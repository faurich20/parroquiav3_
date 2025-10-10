import React from 'react';
import { Calendar } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

const Reservations = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Reservas de Actos Litúrgicos"
                subtitle="Gestiona las reservas y citas"
                icon={Calendar}
            />

            <Card>
                <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Reservas</h3>
                    <p className="text-gray-600">Administra las reservas de bautismos, matrimonios y otros eventos.</p>
                </div>
            </Card>
        </div>
    );
};

export default Reservations;