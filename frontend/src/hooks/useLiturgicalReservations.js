// src/hooks/useLiturgicalReservations.js
import { useCallback, useEffect, useRef } from 'react';
import useCrud from './useCrud';
import { useAuth } from '../contexts/AuthContext';

export default function useLiturgicalReservations(options = {}) {
  const { filters, autoList = true, ...restOptions } = options;
  const baseUrl = 'http://localhost:5000/api/liturgical/reservas';
  const { authFetch } = useAuth();
  const didFetchRef = useRef(false);

  // Usar useCrud con la URL base sin filtros y autoList desactivado
  const crud = useCrud(baseUrl, { ...restOptions, autoList: false });

  // Sobrescribir el método list para agregar filtros
  const list = useCallback(async () => {
    let url = baseUrl;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.personaid) params.append('personaid', filters.personaid);
      if (filters.parroquiaid) params.append('parroquiaid', filters.parroquiaid);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }

    // Llamar al authFetch con la URL filtrada
    try {
      const resp = await authFetch(url);

      if (resp.status === 403) {
        return { success: false, error: 'forbidden' };
      }
      if (!resp.ok) throw new Error('Error al listar');

      const data = await resp.json();
      const items = data.items || [];
      crud.setItems(items);
      return { success: true, data: items };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [baseUrl, filters, crud, authFetch]);

  // Auto-list si está habilitado
  useEffect(() => {
    if (!autoList) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    list();
  }, [list, autoList]);

  return {
    ...crud,
    list
  };
}
