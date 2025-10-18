export const LITURGICAL_API = {
  actos: 'http://localhost:5000/api/liturgical/actos',
  horarios: 'http://localhost:5000/api/liturgical/horarios',
  reservas: 'http://localhost:5000/api/liturgical/reservas',
  calendario: 'http://localhost:5000/api/liturgical/calendario',
  horarios_fecha: 'http://localhost:5000/api/liturgical/horarios/fecha',
};

export const LITURGICAL_TYPES = [
  { value: 'misa', label: 'Misa' },
  { value: 'bautismo', label: 'Bautismo' },
  { value: 'matrimonio', label: 'Matrimonio' },
  { value: 'confirmacion', label: 'Confirmación' },
  { value: 'comunion', label: 'Primera Comunión' },
  { value: 'exequias', label: 'Exequias' },
];

export const ACTO_NOMBRES = [
  { value: 'misa', label: 'Misa' },
  { value: 'bautismo', label: 'Bautismo' },
  { value: 'matrimonio', label: 'Matrimonio' },
  { value: 'confirmacion', label: 'Confirmación' },
  { value: 'comunion', label: 'Primera Comunión' },
  { value: 'exequias', label: 'Exequias' },
];
