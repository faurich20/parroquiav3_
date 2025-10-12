// src/components/Form/ListaPermisos.js
import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import useCatalogoPermisos from '../../hooks/useCatalogoPermisos';
import { useTheme } from '../../contexts/ThemeContext';

const ListaPermisos = ({ value = [], onChange, columnas = 2, disabled = false }) => {
  const { ids, etiquetas } = useCatalogoPermisos();
  const { theme } = useTheme();
  const isDark = theme === 'black';

  const lista = useMemo(() => ids.map((id) => ({ id, nombre: etiquetas[id] || id })), [ids, etiquetas]);

  const toggle = (id) => {
    if (disabled) return;
    if (value.includes(id)) onChange?.(value.filter((x) => x !== id));
    else onChange?.([...(value || []), id]);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columnas} gap-2`}>
      {lista.map((perm) => (
        <div
          key={perm.id}
          className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
            value.includes(perm.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={() => toggle(perm.id)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  value.includes(perm.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}
              >
                {value.includes(perm.id) && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <p className={`font-medium ${value.includes(perm.id) ? 'text-gray-900' : (isDark ? 'text-white' : 'text-gray-900')}`}>{perm.nombre}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListaPermisos;
