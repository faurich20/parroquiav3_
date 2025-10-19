// src/hooks/useLiturgicalSchedules.js
import useCrud from './useCrud';

export default function useLiturgicalSchedules(options = {}) {
  return useCrud('http://localhost:5000/api/liturgical/horarios', options);
}
