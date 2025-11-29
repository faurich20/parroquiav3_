// src/components/Layout/Sidebar.js
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Calendar, DollarSign, ShoppingCart,
  Package, Settings, BarChart3, Shield, Church,
  FileText, Clock, TrendingUp, Archive, ArrowLeft, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// Componente para un sub-item dentro de un menú desplegable
const SubNavItem = ({ to, children, collapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={`block py-1.5 text-sm rounded-md transition-colors duration-200 hover:text-[var(--text-strong)] dark:hover:text-white ${
        isActive
          ? 'text-[var(--primary)] dark:text-blue-400 font-semibold'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {children}
    </NavLink>
  );
};

// Componente para el menú desplegable
const CollapsibleNavItem = ({ item, collapsed }) => {
  const location = useLocation();
  const hasActiveChild = useMemo(() => 
    (item.children || []).some(child => location.pathname.startsWith(child.path)),
    [item.children, location.pathname]
  );

  const [isOpen, setIsOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild && !isOpen) {
      setIsOpen(true);
    }
  }, [hasActiveChild, isOpen]);

  if (collapsed) {
    return (
      <div className="flex justify-center p-2" title={item.title}>
        <item.icon className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-2 rounded-lg font-medium transition-all gap-3"
        style={{ color: 'var(--text)' }}
      >
        <div className="flex items-center gap-3">
          <item.icon className="w-5 h-5" />
          <span className="text-sm">{item.title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="pl-9 mt-1 space-y-1 overflow-hidden"
          >
            {(item.children || []).map(subItem => (
              <SubNavItem key={subItem.path} to={subItem.path}>{subItem.title}</SubNavItem>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = ({ collapsed, toggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { theme } = useTheme();
  const flyoutRef = useRef(null);

  // Definición base de módulos y sub-opciones
  const rawMenuItems = useMemo(
    () => [
      {
        id: 'personal',
        title: 'Módulo Personal',
        icon: Users,
        path: '/personal',
        permission: 'personal',
      },
      {
        id: 'liturgical',
        title: 'Actos Litúrgicos',
        icon: Church,
        path: '/liturgical',
        children: [
          {
            title: 'Actos Litúrgicos',
            path: '/liturgical/acts',
            icon: Church,
            permission: 'liturgico_actos',
          },
          {
            title: 'Horarios',
            path: '/liturgical/horarios',
            icon: Clock,
            permission: 'liturgico_horarios',
          },
          {
            title: 'Reservas',
            path: '/liturgical/reservations',
            icon: Calendar,
            permission: 'liturgico_reservas',
          },
          {
            title: 'Reportes',
            path: '/liturgical/reports',
            icon: FileText,
            permission: 'liturgico_reportes', // Permiso base para ver la sección
            children: [
              // El reporte que ya hicimos
              { title: 'Reporte de Reservas', path: '/liturgical/reports/reservations', permission: 'liturgico_reportes' }, 
              // Los 2 nuevos reportes operativos
              { title: 'Ocupación de Cupos', path: '/liturgical/reports/occupancy', permission: 'liturgico_reportes' },
              { title: 'Actividad por Parroquia', path: '/liturgical/reports/parish-activity', permission: 'liturgico_reportes' },
            ]
          },
        ],
      },
      {
        id: 'sales',
        title: 'Módulo Ventas',
        icon: TrendingUp,
        path: '/ventas',
        permission: 'ventas',
      },
      {
        id: 'purchases',
        title: 'Módulo Compras',
        icon: ShoppingCart,
        path: '/compras',
        permission: 'compras',
      },
      {
        id: 'warehouse',
        title: 'Módulo Almacén',
        icon: Package,
        path: '/almacen',
        permission: 'almacen',
      },
      {
        id: 'accounting',
        title: 'Módulo Contabilidad',
        icon: DollarSign,
        path: '/contabilidad',
        permission: 'contabilidad',
      },
      {
        id: 'reports',
        title: 'Módulo Reportes',
        icon: BarChart3,
        path: '/reports', // Añadimos una ruta base
        permission: 'reportes',
        children: [
          { title: 'Reporte Financiero', 
            path: '/reports/financial', 
            icon: DollarSign, 
            permission: 'reportes_gerenciales' },
          {
            title: 'Reportes de Actos Litúrgicos',
            path: '/reports/management',
            icon: Church,
            permission: 'reportes_gerenciales',
          },
          {
            title: 'Reporte de Feligreces',
            path: '/reports/transactional',
            icon: Archive,
            permission: 'reportes_transaccionales',
          },
        ],
      },
      {
        id: 'security',
        title: 'Módulo Seguridad',
        icon: Shield,
        path: '/seguridad',
        permission: 'seguridad',
        children: [
          {
            title: 'Usuarios',
            path: '/seguridad/usuarios',
            icon: Users,
            permission: 'seguridad_usuarios',
          },
          {
            title: 'Roles',
            path: '/seguridad/roles',
            icon: Shield,
            permission: 'seguridad_roles',
          },
          {
            title: 'Permisos',
            path: '/seguridad/permisos',
            icon: Settings,
            permission: 'seguridad_permisos',
          },
          {
            title: 'Parroquias',
            path: '/seguridad/parroquias',
            icon: Church,
            permission: 'seguridad_parroquias',
          },
        ],
      },
      {
        id: 'configuration',
        title: 'Módulo Configuración',
        icon: Settings,
        path: '/configuracion',
        permission: 'configuracion',
      },
    ],
    []
  );

  // Filtrar menú según permisos del usuario
  // --- MODIFICACIÓN: Ahora también filtra los hijos de los hijos ---
  const menuItems = useMemo(() => {
    if (!hasPermission) return rawMenuItems;

    const filterItems = (items) => {
      if (!items) return [];
      return items
        .filter(item => !item.permission || hasPermission(item.permission))
        .map(item => ({
          ...item,
          children: item.children ? filterItems(item.children) : undefined
        }));
    };

    return filterItems(rawMenuItems).filter(item => {
        const hasModulePerm =
          !item.permission || hasPermission(item.permission);
        const hasVisibleChild =
          Array.isArray(item.children) && item.children.some(child => !child.permission || hasPermission(child.permission));
        // Mostrar módulo si tiene permiso de módulo o al menos un hijo visible
        return hasModulePerm || hasVisibleChild;
      });
  }, [rawMenuItems, hasPermission]);

  const getCurrentModule = () => {
    const currentPath = location.pathname;
    // Ordenar los módulos por la longitud de su path, de más largo a más corto.
    // Esto asegura que '/reports/financial' coincida con '/reports' antes que con '/'.
    const sortedMenuItems = [...menuItems].sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0));

    const parentModule = sortedMenuItems.find(item => {
      // Un módulo es "actual" si la URL empieza con su path.
      // El path no debe ser solo "/" para evitar que todos coincidan con la raíz.
      // Se añade una barra al final del path del item para asegurar una coincidencia de directorio completa.
      const basePath = item.path.endsWith('/') ? item.path : `${item.path}/`;
      return item.path && item.path !== '/' && (currentPath.startsWith(basePath) || currentPath === item.path);
    });

    return parentModule || null; // Si no estamos en ningún módulo, no se selecciona ninguno.
  };

  const currentModule = getCurrentModule();
  const filteredMenu = currentModule || null;

  const isActive = (path) => location.pathname.startsWith(path);
  const isDarkTheme = theme === 'black';

  useEffect(() => {
    function handleClickOutside(event) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        // nada por ahora
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside
      className="h-full flex flex-col shrink-0"
      style={{
        width: collapsed ? 80 : 256,
        background: 'var(--surface)',
        borderRight: `1px solid var(--border)`,
      }}
    >
      {/* Logo y título */}
      <div
        onClick={toggleCollapse}
        className={`flex items-center gap-3 h-16 px-4 border-b cursor-pointer ${
          collapsed ? 'justify-center' : ''
        }`}
        style={{ borderColor: 'var(--border)' }}
      >
        <Church className="w-8 h-8" style={{ color: 'var(--primary)' }} />
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              CHASKIS
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Sistema de Parroquia</p>
          </div>
        )}
      </div>

      {/* Menú actual */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-2 relative">
        {filteredMenu ? (
          <>
            {/* Botón regresar a Bienvenida */}
            <button
              onClick={() => navigate('/bienvenida')}
              className={`flex items-center w-full p-2 mb-3 rounded-lg font-medium transition-all ${
                collapsed ? 'justify-center' : 'gap-3'
              }`}
              style={{
                background: 'transparent',
                color: 'var(--muted)',
              }}
            >
              <ArrowLeft className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Regresar</span>}
            </button>

            {filteredMenu.children && filteredMenu.children.length > 0 ? (
              <div>
                {!collapsed && (
                  <p
                    className="text-xs font-semibold px-2 mb-2"
                    style={{ color: 'var(--muted)' }}
                  >
                    {filteredMenu.title}
                  </p>
                )}
                {/* --- INICIO DE LA MODIFICACIÓN DE RENDERIZADO --- */}
                {filteredMenu.children.map((child) => {
                  // Si el item tiene hijos, es un menú desplegable
                  if (child.children && child.children.length > 0) {
                    return <CollapsibleNavItem key={child.path} item={child} collapsed={collapsed} />;
                  }
                  // Si no, es un enlace normal
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`flex items-center p-2 rounded-lg font-medium transition-all ${
                        collapsed ? 'justify-center' : 'gap-3'
                      }`}
                      style={{
                        background: isActive(child.path) ? 'var(--surface-2)' : 'transparent',
                        color: isActive(child.path)
                          ? isDarkTheme
                            ? 'var(--text-strong)'
                            : 'var(--primary)'
                          : 'var(--text)',
                      }}
                    >
                      <child.icon className="w-5 h-5" />
                      {!collapsed && (
                        <span className="text-sm">{child.title}</span>
                      )}
                    </Link>
                  );
                })}
                {/* --- FIN DE LA MODIFICACIÓN DE RENDERIZADO --- */}
              </div>
            ) : (
              <Link
                to={filteredMenu.path}
                className={`flex items-center p-2 rounded-lg font-medium transition-all ${
                  collapsed ? 'justify-center' : 'gap-3'
                }`}
                style={{
                  background: isActive(filteredMenu.path)
                    ? 'var(--surface-2)'
                    : 'transparent',
                  color: isActive(filteredMenu.path)
                    ? isDarkTheme
                      ? 'var(--text-strong)'
                      : 'var(--primary)'
                    : 'var(--text)',
                }}
              >
                <filteredMenu.icon className="w-5 h-5" />
                {!collapsed && (
                  <span className="text-sm">{filteredMenu.title}</span>
                )}
              </Link>
            )}
          </>
        ) : null}
      </nav>

      {/* Información usuario */}
      <div
        className="p-2 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className={`flex items-center gap-2 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, var(--primary), var(--secondary))',
            }}
          >
            <span className="text-white text-sm font-bold">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div>
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text)' }}
              >
                {user?.name || 'Usuario'}
              </p>
              <p
                className="text-xs capitalize"
                style={{ color: 'var(--muted)' }}
              >
                {user?.role || 'usuario'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
