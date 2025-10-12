import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false); // controla colapso/expansión

    const toggleSidebar = () => setCollapsed(!collapsed);

    return (
        <div className="flex h-screen" style={{ background: 'var(--background)', color: 'var(--text)' }}>
            {/* Sidebar siempre visible */}
            <Sidebar collapsed={collapsed} toggleCollapse={toggleSidebar} />

            {/* Contenido principal con margen dinámico */}
            <main className="flex-1 flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
                <Header />
                <div className="flex-1 overflow-y-auto p-6" style={{ background: 'transparent' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;