import React from "react";
import { Link } from "react-router-dom";
import {
  Shield, Users, Church, Calculator, ShoppingCart, Package, Settings, FileText
} from "lucide-react";
import PageHeader from "../components/Common/PageHeader";
import { useAuth } from "../contexts/AuthContext";

// Definición de módulos del menú principal y permisos requeridos por módulo
const modules = [
  {
    name: "Módulo de Seguridad",
    path: "/seguridad/usuarios",
    icon: Shield,
    color: "from-blue-500 to-indigo-500",
    perms: ["seguridad", "seguridad_usuarios", "seguridad_roles", "seguridad_permisos", "seguridad_parroquias"],
  },
  {
    name: "Módulo de Personal",
    path: "/personal",
    icon: Users,
    color: "from-green-500 to-emerald-500",
    perms: ["personal"],
  },
  {
    name: "Módulo de Actos Litúrgicos",
    path: "/liturgico",
    icon: Church,
    color: "from-purple-500 to-pink-500",
    // Cualquier permiso litúrgico permite ver el módulo
    perms: [
      "liturgico",
      "liturgico_actos",
      "liturgico_horarios",
      "liturgico_reservas",
      "liturgico_reportes",
    ],
  },
  {
    name: "Módulo de Contabilidad",
    path: "/contabilidad",
    icon: Calculator,
    color: "from-orange-500 to-red-500",
    perms: ["contabilidad"],
  },
  {
    name: "Módulo de Ventas",
    path: "/ventas",
    icon: ShoppingCart,
    color: "from-yellow-500 to-amber-500",
    perms: ["ventas"],
  },
  {
    name: "Módulo de Compras",
    path: "/compras",
    icon: ShoppingCart,
    color: "from-teal-500 to-cyan-500",
    perms: ["compras"],
  },
  {
    name: "Módulo de Almacén",
    path: "/almacen",
    icon: Package,
    color: "from-fuchsia-500 to-purple-600",
    perms: ["almacen"],
  },
  {
    name: "Módulo de Configuración",
    path: "/configuracion",
    icon: Settings,
    color: "from-gray-600 to-gray-800",
    perms: ["configuracion"],
  },
  {
    name: "Reportes Generales",
    path: "/reportes/gerenciales",
    icon: FileText,
    color: "from-pink-500 to-rose-500",
    perms: ["reportes", "reportes_gerenciales", "reportes_transaccionales"],
  },
];

const Bienvenida = () => {
  const { hasPermission } = useAuth();

  // Si no tiene permiso de menú principal, no mostrar módulos
  const canSeeMenuPrincipal = hasPermission("menu_principal");

  const visibleModules = canSeeMenuPrincipal
    ? modules.filter((mod) => {
        if (!mod.perms || mod.perms.length === 0) return true;
        return mod.perms.some((p) => hasPermission(p));
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bienvenido al Sistema Parroquial"
        subtitle="Selecciona un módulo para comenzar"
        icon={Church}
      />

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleModules.map((mod) => (
          <Link
            key={mod.name}
            to={mod.path}
            className="group block rounded-2xl p-6 shadow-sm border transition-transform hover:scale-[1.02] hover:shadow-md"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-r ${mod.color} mb-4`}
            >
              <mod.icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-strong group-hover:opacity-90">
              {mod.name}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Bienvenida;
