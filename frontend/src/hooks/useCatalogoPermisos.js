// src/hooks/useCatalogoPermisos.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISOS as PERMISOS_LOCAL, ETIQUETAS_PERMISOS } from '../constants/permissions';

// Hook en español para obtener y normalizar el catálogo de permisos
// Devuelve: { ids, etiquetas, loading, error, refrescar }
export default function useCatalogoPermisos() {
  const { authFetch } = useAuth();
  const [ids, setIds] = useState(PERMISOS_LOCAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const didRun = useRef(false);

  if (!window.__permCache) {
    window.__permCache = { value: null, expiry: 0 };
  }

  useEffect(() => {
    let cancelado = false;
    const now = Date.now();
    const fromCache = window.__permCache;
    if (fromCache.value && fromCache.expiry > now) {
      setIds(fromCache.value);
    }
    if (didRun.current) return () => { cancelado = true; };
    didRun.current = true;
    const cargar = async () => {
      try {
        setLoading(true);
        setError('');
        const resp = await authFetch('http://localhost:5000/api/permissions');
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelado && Array.isArray(data.permissions)) {
          const norm = data.permissions
            .map((p) => (typeof p === 'string' ? p : (p && (p.id || p.name)) || ''))
            .filter(Boolean);
          window.__permCache = { value: norm, expiry: now + 60000 };
          setIds(norm);
        }
      } catch (e) {
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    if (!fromCache.value || fromCache.expiry <= now) cargar();
    return () => { cancelado = true; };
  }, [authFetch]);

  const etiquetas = useMemo(() => {
    const map = {};
    ids.forEach((id) => { map[id] = ETIQUETAS_PERMISOS[id] || id; });
    return map;
  }, [ids]);

  const refrescar = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await authFetch('http://localhost:5000/api/permissions');
      if (!resp.ok) return { success: false };
      const data = await resp.json();
      if (Array.isArray(data.permissions)) {
        const norm = data.permissions
          .map((p) => (typeof p === 'string' ? p : (p && (p.id || p.name)) || ''))
          .filter(Boolean);
        window.__permCache = { value: norm, expiry: Date.now() + 60000 };
        setIds(norm);
      }
      return { success: true };
    } catch (e) {
      setError(e.message || 'Error cargando permisos');
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  return { ids, etiquetas, loading, error, refrescar };
}
