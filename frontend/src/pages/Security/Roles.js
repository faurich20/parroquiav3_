import React from 'react';
import { Shield, Plus } from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';

const RolesPage = () => {
    const roles = [
        {
            id: 1,
            name: 'Administrador',
            description: 'Acceso completo al sistema',
            permissions: 10,
            users: 1
        },
        {
            id: 2,
            name: 'Secretaria',
            description: 'Gestión de eventos y personal',
            permissions: 6,
            users: 2
        },
        {
            id: 3,
            name: 'Tesorero',
            description: 'Gestión financiera y contable',
            permissions: 4,
            users: 1
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Roles"
                subtitle="Administra los roles y permisos del sistema"
                icon={Shield}
            >
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nuevo Rol
                </button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                    <Card key={role.id}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                            </button>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{role.name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{role.description}</p>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{role.permissions} permisos</span>
                            <span className="text-gray-500">{role.users} usuarios</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default RolesPage;