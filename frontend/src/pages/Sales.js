import React from 'react';
import { TrendingUp } from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';

const Sales = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Ventas"
                subtitle="Gestión de ventas y servicios"
                icon={TrendingUp}
            />

            <Card>
                <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ventas</h3>
                    <p className="text-gray-600">Administra las ventas de productos y servicios parroquiales.</p>
                </div>
            </Card>
        </div>
    );
};

export default Sales;