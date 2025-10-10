import React from 'react';
import { Package } from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';

const Warehouse = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Almacén"
                subtitle="Gestión de inventario y almacén"
                icon={Package}
            />

            <Card>
                <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Almacén</h3>
                    <p className="text-gray-600">Controla el inventario y gestiona el almacén parroquial.</p>
                </div>
            </Card>
        </div>
    );
};

export default Warehouse;