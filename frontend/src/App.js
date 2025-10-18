// export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginForm from './components/Auth/LoginForm';

// Pages
import Dashboard from './pages/Dashboard';
import Bienvenida from './pages/Bienvenida';
import Personal from './pages/Personal';
import Accounting from './pages/Accounting';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Warehouse from './pages/Warehouse';
import Configuration from './pages/Configuration';

// Security Pages
import UsersPage from './pages/Security/Users';
import RolesPage from './pages/Security/Roles';
import PermissionsPage from './pages/Security/Permissions';
import ParroquiasPage from './pages/Security/Parroquias';

// Liturgical Pages
import ActoLiturgico from './pages/Liturgical/ActoLiturgico';
import Horarios from './pages/Liturgical/Horarios';
import Reservacion from './pages/Liturgical/Reservacion';
import LiturgicalReports from './pages/Liturgical/LiturgicalReports';

// Reports Pages
import ManagementReports from './pages/Reports/ManagementReports';
import TransactionReports from './pages/Reports/TransactionReports';
// Componente protegido con Layout y Outlet
const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route element={<ProtectedRoutes />}>
            <Route index element={<Navigate to="/bienvenida" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bienvenida" element={<Bienvenida />} />
            <Route path="/personal" element={<Personal />} />
            <Route path="/contabilidad" element={<Accounting />} />
            <Route path="/ventas" element={<Sales />} />
            <Route path="/compras" element={<Purchases />} />
            <Route path="/almacen" element={<Warehouse />} />
            <Route path="/configuracion" element={<Configuration />} />
            <Route path="/seguridad/usuarios" element={<UsersPage />} />
            <Route path="/seguridad/roles" element={<RolesPage />} />
            <Route path="/seguridad/permisos" element={<PermissionsPage />} />
            <Route path="/seguridad/parroquias" element={<ParroquiasPage />} />
            <Route path="/liturgico/gestionar" element={<ActoLiturgico />} />
            <Route path="/liturgico/horarios" element={<Horarios />} />
            <Route path="/liturgico/reservas" element={<Reservacion />} />
            <Route path="/liturgico/reportes" element={<LiturgicalReports />} />
            <Route path="/reportes/gerenciales" element={<ManagementReports />} />
            <Route path="/reportes/transaccionales" element={<TransactionReports />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;