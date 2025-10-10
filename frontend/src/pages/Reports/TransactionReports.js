import React from 'react';
import { Archive } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

const TransactionReports = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Reportes Transaccionales"
                subtitle="Reportes detallados de transacciones"
                icon={Archive}
            />

            <Card>
                <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes Transaccionales</h3>
                    <p className="text-gray-600">Genera reportes detallados de todas las transacciones.</p>
                </div>
            </Card>
        </div>
    );
};

export default TransactionReports;