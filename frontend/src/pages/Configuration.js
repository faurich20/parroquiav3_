import React from 'react';
import { Settings } from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';

const Configuration = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Configuración"
                subtitle="Configuración general del sistema"
                icon={Settings}
            />

            <Card>
                <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuración</h3>
                    <p className="text-gray-600">Configura los parámetros generales del sistema.</p>
                </div>
            </Card>
        </div>
    );
};

export default Configuration;