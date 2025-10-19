// src/hooks/useLiturgicalCalendar.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function useLiturgicalCalendar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { authFetch } = useAuth();

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('http://localhost:5000/api/liturgical/calendario');
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchHorariosByDate = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`http://localhost:5000/api/liturgical/horarios/fecha/${date}`);
      const data = await response.json();
      return data.items || [];
    } catch (err) {
      setError(err.message);
      console.error('Error fetching horarios by date:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return {
    items,
    loading,
    error,
    refetch: fetchCalendar,
    fetchHorariosByDate,
  };
}
