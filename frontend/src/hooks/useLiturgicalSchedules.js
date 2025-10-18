// src/hooks/useLiturgicalSchedules.js
import useCrud from './useCrud';
import { LITURGICAL_API } from '../constants/liturgical';

export default function useLiturgicalSchedules(options = {}) {
  return useCrud(LITURGICAL_API.horarios, options);
}
