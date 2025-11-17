// src/components/Modals/SelectorRol.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Selector de roles con fetch al backend y fallback local.
// Si se pasa la prop `roles` (array de nombres), se usa esa lista
// y no se hace fetch al backend.
// Props: value, onChange, disabled, roles, className
const SelectorRol = ({ value, onChange, disabled = false, className = '', roles: rolesProp }) => {
  const { authFetch } = useAuth();
  const [rolesFromApi, setRolesFromApi] = useState([]);

  useEffect(() => {
    // Si el padre ya provee la lista de roles, no es necesario consultar al backend
    if (rolesProp && Array.isArray(rolesProp) && rolesProp.length > 0) {
      return;
    }

    let cancelado = false;
    const cargar = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/roles');
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelado) {
          setRolesFromApi(Array.isArray(data.roles) ? data.roles : []);
        }
      } catch (_) {
        // fallback silencioso
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [authFetch, rolesProp]);

  // Construir lista de nombres de roles en este orden de prioridad:
  // 1) rolesProp (si viene del padre)
  // 2) roles obtenidos del backend
  // 3) lista local de respaldo
  const roleNames =
    (rolesProp && Array.isArray(rolesProp) && rolesProp.length > 0)
      ? rolesProp
      : (rolesFromApi.length
          ? rolesFromApi.map(r => r.name)
          : ['admin', 'secretaria', 'tesorero', 'colaborador', 'user']);

  const options = roleNames.map(name => ({
    value: name,
    label: name,
  }));

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      <option value="">Selecciona un rol...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

export default SelectorRol;
