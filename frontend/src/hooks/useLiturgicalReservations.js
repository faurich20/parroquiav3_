// src/hooks/useLiturgicalReservations.js
import useCrud from './useCrud';
import { LITURGICAL_API } from '../constants/liturgical';

export default function useLiturgicalReservations(options = {}) {
  return useCrud(LITURGICAL_API.reservas, options);
}
