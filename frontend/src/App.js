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
import Reservas from './pages/Liturgical/Reservas';
import ReporteReserva from './pages/Liturgical/ReporteReserva';
import OccupancyReport from './pages/Liturgical/OccupancyReport'; // Ruta consistente
import ParishActivityReport from './pages/Liturgical/ParishActivityReport'; // Ruta corregida y consistente

// Reports Pages
import ManagementReports from './pages/Reports/ManagementReports';
import FinancialReport from './pages/Reports/FinancialReport';
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

const securityRoutes = [
  { path: '/seguridad/usuarios', perms: ['seguridad_usuarios', 'seguridad'] },
  { path: '/seguridad/roles', perms: ['seguridad_roles', 'seguridad'] },
  { path: '/seguridad/permisos', perms: ['seguridad_permisos', 'seguridad'] },
  { path: '/seguridad/parroquias', perms: ['seguridad_parroquias', 'seguridad'] }
];

const SecurityEntry = () => {
  const { hasPermission } = useAuth();

  const target = securityRoutes.find((route) =>
    route.perms.some((perm) => hasPermission(perm))
  );

  if (target) {
    return <Navigate to={target.path} replace />;
  }

  return <Navigate to="/bienvenida" replace />;
};

const reportsRoutes = [
  // La primera ruta debe ser la del reporte que ya construimos
  { path: '/reports/financial', perms: ['reportes_gerenciales'] },
  { path: '/reports/management', perms: ['reportes_gerenciales'] },
  { path: '/reportes/transaccionales', perms: ['reportes_transaccionales', 'reportes'] }
];

const ReportsEntry = () => {
  const { hasPermission } = useAuth();

  const target = reportsRoutes.find((route) =>
    route.perms.some((perm) => hasPermission(perm))
  );

  if (target) {
    return <Navigate to={target.path} replace />;
  }

  return <Navigate to="/bienvenida" replace />;
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

  // Redirigir a las rutas estandarizadas
  if (canActos) return <Navigate to="/liturgical/acts" replace />;
  if (canHorarios) return <Navigate to="/liturgical/horarios" replace />;
  if (canReservas) return <Navigate to="/liturgical/reservations" replace />;
  if (canReportes) return <Navigate to="/liturgical/reports/reservations" replace />;

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
            <Route
              path="/seguridad"
              element={
                <RequirePermission perm={['seguridad', 'seguridad_usuarios', 'seguridad_roles', 'seguridad_permisos', 'seguridad_parroquias']}>
                  <SecurityEntry />
                </RequirePermission>
              }
            />
            <Route path="/seguridad/usuarios" element={<RequirePermission perm="seguridad"><UsersPage /></RequirePermission>} />
            <Route path="/seguridad/roles" element={<RequirePermission perm="seguridad"><RolesPage /></RequirePermission>} />
            <Route path="/seguridad/permisos" element={<RequirePermission perm="seguridad"><PermissionsPage /></RequirePermission>} />
            <Route path="/seguridad/parroquias" element={<RequirePermission perm="seguridad"><ParroquiasPage /></RequirePermission>} />
            <Route
              path="/reports"
              element={
                <RequirePermission perm={['reportes', 'reportes_gerenciales', 'reportes_transaccionales']}>
                  <ReportsEntry />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgical"
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
              path="/liturgical/acts"
              element={
                <RequirePermission
                  perm={['liturgico', 'liturgico_actos', 'liturgico_actos_ver']}
                >
                  <ActoLiturgico />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgical/horarios"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_horarios']}>
                  <Horarios />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgical/reservations"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_reservas']}>
                  <Reservas />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgical/reports/reservations"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_reportes']}>
                  <ReporteReserva />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgical/reports/occupancy"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_reportes']}>
                  <OccupancyReport />
                </RequirePermission>
              }
            />
            <Route
              path="/liturgical/reports/parish-activity"
              element={
                <RequirePermission perm={['liturgico', 'liturgico_reportes']}>
                  <ParishActivityReport />
                </RequirePermission>
              }
            />
            <Route
              path="/reports/management"
              element={
                <RequirePermission perm="reportes">
                  <ManagementReports />
                </RequirePermission>
              }
            />
            <Route
              path="/reports/financial"
              element={
                <RequirePermission perm={['reportes_gerenciales', 'reportes']}>
                  <FinancialReport />
                </RequirePermission>
              }
            />
             {/* Ruta para Reportes Transaccionales */}
            <Route 
              path="/reports/transactional" 
              element={
                <RequirePermission perm="reportes_transaccionales"><TransactionReports /></RequirePermission>
              } 
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
