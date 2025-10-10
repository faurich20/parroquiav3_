import React from 'react';
import { Users } from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';

const Personal = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Personal"
                subtitle="Administra el personal de la parroquia"
                icon={Users}
            />

            <Card>
                <div className="text-center py-12">
                    {/* Ícono usa muted para ser discreto */}
                    <Users className="w-16 h-16 text-muted mx-auto mb-4" />

                    {/* Título usa strong para que cambie según tema */}
                    <h3 className="text-lg font-semibold text-strong mb-2">
                        Gestión de Personal
                    </h3>
                    {/* Texto normal controlado por tema */}
                    <p className="text-normal">
                        Administra la información del personal de la parroquia.
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Personal;
