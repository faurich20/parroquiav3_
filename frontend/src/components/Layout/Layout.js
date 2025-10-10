import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false); // controla colapso/expansión

    const toggleSidebar = () => setCollapsed(!collapsed);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar siempre visible */}
            <Sidebar collapsed={collapsed} toggleCollapse={toggleSidebar} />

            {/* Contenido principal con margen dinámico */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;