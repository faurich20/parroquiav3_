import React from 'react';
import { Clock } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

const Schedules = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Horarios"
                subtitle="Gestiona los horarios de los actos litúrgicos"
                icon={Clock}
            />

            <Card>
                <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Horarios</h3>
                    <p className="text-gray-600">Configura y administra los horarios de misas y eventos.</p>
                </div>
            </Card>
        </div>
    );
};

export default Schedules;