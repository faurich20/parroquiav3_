// src/hooks/useLiturgicalActs.js
import useCrud from './useCrud';
import { LITURGICAL_API } from '../constants/liturgical';

export default function useLiturgicalActs(options = {}) {
  return useCrud(LITURGICAL_API.acts, options);
}
