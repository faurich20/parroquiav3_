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

// Guard de permiso por ruta
const RequirePermission = ({ perm, children }) => {
  const { hasPermission } = useAuth();

  if (!perm) return children;

  // Permitir que perm sea string o array de permisos
  const permsArray = Array.isArray(perm) ? perm : [perm];
  const allowed = permsArray.some((p) => hasPermission(p));

  return allowed ? children : <Navigate to="/bienvenida" replace />;
};

// Entrada de módulo litúrgico: redirige a la primera subruta permitida
const LiturgicalEntry = () => {
  const { hasPermission } = useAuth();

  const canActos =
    hasPermission('liturgico') ||
    hasPermission('liturgico_actos') ||
    hasPermission('liturgico_actos_ver');
  const canHorarios = hasPermission('liturgico') || hasPermission('liturgico_horarios');
  const canReservas = hasPermission('liturgico') || hasPermission('liturgico_reservas');
  const canReportes = hasPermission('liturgico') || hasPermission('liturgico_reportes');

  if (canActos) return <Navigate to="/liturgico/gestionar" replace />;
  if (canHorarios) return <Navigate to="/liturgico/horarios" replace />;
  if (canReservas) return <Navigate to="/liturgico/reservas" replace />;
  if (canReportes) return <Navigate to="/liturgico/reportes" replace />;

  return <Navigate to="/bienvenida" replace />;
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
            <Route path="/personal" element={<RequirePermission perm="personal"><Personal /></RequirePermission>} />
            <Route path="/contabilidad" element={<RequirePermission perm="contabilidad"><Accounting /></RequirePermission>} />
            <Route path="/ventas" element={<RequirePermission perm="ventas"><Sales /></RequirePermission>} />
            <Route path="/compras" element={<RequirePermission perm="compras"><Purchases /></RequirePermission>} />
            <Route path="/almacen" element={<RequirePermission perm="almacen"><Warehouse /></RequirePermission>} />
            <Route path="/configuracion" element={<RequirePermission perm="configuracion"><Configuration /></RequirePermission>} />
            <Route path="/seguridad/usuarios" element={<RequirePermission perm="seguridad"><UsersPage /></RequirePermission>} />
            <Route path="/seguridad/roles" element={<RequirePermission perm="seguridad"><RolesPage /></RequirePermission>} />
            <Route path="/seguridad/permisos" element={<RequirePermission perm="seguridad"><PermissionsPage /></RequirePermission>} />
            <Route path="/seguridad/parroquias" element={<RequirePermission perm="seguridad"><ParroquiasPage /></RequirePermission>} />
            <Route
              path="/liturgico"
              element={
                <RequirePermission
                  perm={[
                    'liturgico',
                    'liturgico_actos',
                    'liturgico_horarios',
                    'liturgico_reservas',
                    'liturgico_reportes',
                  ]}
                >
                  <LiturgicalEntry />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgico/gestionar"
              element={
                <RequirePermission
                  perm={['liturgico', 'liturgico_actos', 'liturgico_actos_ver']}
                >
                  <ActoLiturgico />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgico/horarios"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_horarios']}>
                  <Horarios />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgico/reservas"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_reservas']}>
                  <Reservacion />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgico/reportes"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_reportes']}>
                  <LiturgicalReports />
                </RequirePermission>
              }
            />
            <Route path="/reportes/gerenciales" element={<RequirePermission perm="reportes"><ManagementReports /></RequirePermission>} />
            <Route path="/reportes/transaccionales" element={<RequirePermission perm="reportes"><TransactionReports /></RequirePermission>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
