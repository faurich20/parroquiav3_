// src/hooks/useLiturgicalCalendar.js
import { useState, useEffect } from 'react';
import { LITURGICAL_API } from '../constants/liturgical';

export default function useLiturgicalCalendar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCalendar = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(LITURGICAL_API.calendario, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHorariosByDate = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${LITURGICAL_API.horarios_fecha}/${date}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (err) {
      setError(err.message);
      console.error('Error fetching horarios by date:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  return {
    items,
    loading,
    error,
    refetch: fetchCalendar,
    fetchHorariosByDate,
  };
}
