// src/hooks/useLiturgicalActs.js
import useCrud from './useCrud';

export default function useLiturgicalActs(options = {}) {
  return useCrud('http://localhost:5000/api/liturgical/actos', options);
}
