// src/hooks/useLiturgicalReservations.js
import useCrud from './useCrud';

export default function useLiturgicalReservations(options = {}) {
  const { filters, ...restOptions } = options;
  let url = 'http://localhost:5000/api/liturgical/reservas';

  if (filters) {
    const params = new URLSearchParams();
    if (filters.personaid) params.append('personaid', filters.personaid);
    if (filters.parroquiaid) params.append('parroquiaid', filters.parroquiaid);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
  }

  return useCrud(url, restOptions);
}
