// src/components/Modals/SelectorRol.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Selector de roles con fetch al backend y fallback local.
// Props: value, onChange, disabled
const SelectorRol = ({ value, onChange, disabled = false, className = '' }) => {
  const { authFetch } = useAuth();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/roles');
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelado) setRoles(Array.isArray(data.roles) ? data.roles : []);
      } catch (_) {
        // fallback silencioso
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [authFetch]);

  const options = roles.length ? roles.map(r => ({ value: r.name, label: r.name })) : [
    { value: 'admin', label: 'admin' },
    { value: 'secretaria', label: 'secretaria' },
    { value: 'tesorero', label: 'tesorero' },
    { value: 'colaborador', label: 'colaborador' },
    { value: 'user', label: 'user' },
  ];

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

export default SelectorRol;
