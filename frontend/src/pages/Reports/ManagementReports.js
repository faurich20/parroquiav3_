import React from 'react';
import { TrendingUp } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

const ManagementReports = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Reportes Gerenciales"
                subtitle="Reportes ejecutivos y de gestión"
                icon={TrendingUp}
            />

            <Card>
                <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes Gerenciales</h3>
                    <p className="text-gray-600">Genera reportes ejecutivos y análisis de gestión.</p>
                </div>
            </Card>
        </div>
    );
};

export default ManagementReports;