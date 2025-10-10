import React from 'react';
import { FileText } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

const LiturgicalReports = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Reportes Litúrgicos"
                subtitle="Reportes de actos litúrgicos"
                icon={FileText}
            />

            <Card>
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes Litúrgicos</h3>
                    <p className="text-gray-600">Genera reportes de actividades litúrgicas y estadísticas.</p>
                </div>
            </Card>
        </div>
    );
};

export default LiturgicalReports;