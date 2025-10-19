// src/hooks/useCrud.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function useCrud(baseUrl, options = {}) {
  const { autoList = true } = options;
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const didFetchRef = useRef(false);

  const list = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await authFetch(baseUrl);
      if (!resp.ok) throw new Error('Error al listar');
      const data = await resp.json();
      const key = Object.keys(data).find(k => Array.isArray(data[k])) || 'items';
      setItems(data[key] || []);
      return { success: true, data: data[key] || [] };
    } catch (e) {
      setError(e.message || 'Error desconocido');
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, [authFetch, baseUrl]);

  const createItem = useCallback(async (payload) => {
    try {
      const resp = await authFetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'Error al crear');
      }
      const data = await resp.json();
      const item = data.item || data.role || data.user || data.data;
      if (item) setItems(prev => [item, ...prev]);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [authFetch, baseUrl]);

  const updateItem = useCallback(async (id, payload) => {
    try {
      const resp = await authFetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'Error al actualizar');
      }
      const data = await resp.json();
      const item = data.item || data.role || data.user || data.data;
      if (item) {
        setItems(prev => prev.map(i => {
          const itemId = i.id || i.reservaid || i.parroquiaid || i.horarioid;
          return itemId === id ? item : i;
        }));
      }
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [authFetch, baseUrl]);

  const removeItem = useCallback(async (id) => {
    try {
      const resp = await authFetch(`${baseUrl}/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'Error al eliminar');
      }
      setItems(prev => prev.filter(i => {
        const itemId = i.id || i.reservaid || i.parroquiaid || i.horarioid;
        return itemId !== id;
      }));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [authFetch, baseUrl]);

  const updateStatus = useCallback(async (id, status) => {
    try {
      const resp = await authFetch(`${baseUrl}/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'Error al cambiar estado');
      }
      const data = await resp.json();
      const item = data.item || data.role || data.user || data.data;
      if (item) setItems(prev => prev.map(i => (i.id === id ? item : i)));
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [authFetch, baseUrl]);

  const api = useMemo(() => ({ list, createItem, updateItem, removeItem, updateStatus }), [list, createItem, updateItem, removeItem, updateStatus]);

  useEffect(() => {
    if (!autoList) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    list();
  }, [list, autoList]);

  return { items, setItems, loading, error, ...api };
}
