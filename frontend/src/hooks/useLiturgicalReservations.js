// src/hooks/useLiturgicalReservations.js
import useCrud from './useCrud';

export default function useLiturgicalReservations(options = {}) {
  return useCrud('http://localhost:5000/api/liturgical/reservas', options);
}
