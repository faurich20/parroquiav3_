// src/hooks/useParroquias.js
import useCrud from './useCrud';

export default function useParroquias(options = {}) {
  return useCrud('http://localhost:5000/api/parroquias', options);
}
