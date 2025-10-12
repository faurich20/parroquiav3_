import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, LogOut, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeMenu from './ThemeMenu';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'black';
  const tieneNotificaciones = false; // cambia a tu lógica real

  // 📌 Mapa de nombres amigables para breadcrumbs
  const breadcrumbMap = {
    bienvenida: 'Bienvenida',
    dashboard: 'Tablero',
    personal: 'Personal',
    contabilidad: 'Contabilidad',
    ventas: 'Ventas',
    compras: 'Compras',
    almacen: 'Almacén',
    configuracion: 'Configuración',
    seguridad: 'Seguridad',
    usuarios: 'Usuarios',
    roles: 'Roles',
    permisos: 'Permisos',
    liturgico: 'Litúrgico',
    gestionar: 'Gestionar Actos',
    horarios: 'Horarios',
    reservas: 'Reservas',
    reportes: 'Reportes',
    gerenciales: 'Gerenciales',
    transaccionales: 'Transaccionales'
  };

  // 📌 Generar breadcrumbs a partir de la ruta actual
  const pathnames = location.pathname.split('/').filter((x) => x);

  const showBackButton = pathnames.length > 1; // Mostrar botón atrás solo en submódulos

  const handleLogout = async () => {
    try {
      await logout();
      // El redireccionamiento lo maneja el AuthContext automáticamente
    } catch (error) {
      console.error('Error durante logout:', error);
    }
  };

  return (
    <motion.header
      className="px-6 h-16 flex items-center"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--surface)',
        borderBottom: `1px solid var(--border)`
      }}
    >
      <div className="flex items-center justify-between w-full">
        {/* 🔙 Botón atrás + Breadcrumbs */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <motion.button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              title="Regresar"
              style={{ background: 'var(--surface-2)' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text)' }} />
            </motion.button>
          )}

          {/* 📌 Breadcrumbs */}
          <nav className="flex items-center text-sm font-medium space-x-2">
            <Link
              to="/bienvenida"
              style={{ color: 'var(--text)' }}
              className="hover:underline"
            >
              Inicio
            </Link>
            {pathnames.map((value, index) => {
              const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
              const isLast = index === pathnames.length - 1;
              const label = breadcrumbMap[value] || value;

              return (
                <span key={routeTo} className="flex items-center space-x-2">
                  <span style={{ color: 'var(--muted)' }}>/</span>
                  {isLast ? (
                    <Link
                      to={routeTo}
                      onClick={(e) => { e.preventDefault(); navigate(0); }}
                      style={{ color: isDarkTheme ? '#3b82f6' : 'var(--primary)', fontWeight: 700 }}
                      className="hover:underline"
                    >
                      {label}
                    </Link>
                  ) : (
                    <Link
                      to={routeTo}
                      style={{ color: 'var(--text)' }}
                      className="hover:underline"
                    >
                      {label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        </div>

        {/* 🔍 Buscador */}
        <div
          className="hidden md:flex items-center gap-3 rounded-xl px-4 py-2 w-96"
          style={{ background: 'var(--input-bg)' }}
        >
          <Search className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Buscar en el sistema..."
            className="bg-transparent border-none outline-none flex-1"
            style={{ color: 'var(--text)', caretColor: 'var(--primary)' }}
          />
        </div>

        {/* 👤 Acciones de usuario */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* BOTÓN DE TEMA */}
          <ThemeMenu />

          {/* Notificaciones */}
          <motion.button
            className="p-2 rounded-lg transition-colors relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            aria-label="Notificaciones"
            style={{ background: 'transparent' }}
          >
            <Bell className="w-6 h-6" style={{ color: 'var(--text)' }} />
            {tieneNotificaciones && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 12,
                  height: 12,
                  background: '#ef4444',
                  borderRadius: 9999
                }}
              />
            )}
          </motion.button>

          {/* Usuario + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {user?.name}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--muted)', textTransform: 'capitalize' }}
              >
                {user?.role}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                aria-label="Perfil"
                style={{
                  background:
                    'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                }}
              >
                <User className="w-5 h-5" />
              </motion.button>

              <motion.button
                onClick={handleLogout}
                className="p-2 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                title="Cerrar Sesión"
                style={{ color: '#ef4444', background: 'transparent' }}
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;