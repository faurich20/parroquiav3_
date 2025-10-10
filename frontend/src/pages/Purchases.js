import React from 'react';
import { ShoppingCart } from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';

const Purchases = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Compras"
                subtitle="Gestión de compras y proveedores"
                icon={ShoppingCart}
            />

            <Card>
                <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Compras</h3>
                    <p className="text-gray-600">Administra las compras y relaciones con proveedores.</p>
                </div>
            </Card>
        </div>
    );
};

export default Purchases;