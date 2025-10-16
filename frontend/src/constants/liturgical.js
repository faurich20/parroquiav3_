export const LITURGICAL_API = {
  acts: 'http://localhost:5000/api/liturgical/acts',
  schedules: 'http://localhost:5000/api/liturgical/schedules',
  reservations: 'http://localhost:5000/api/liturgical/reservations',
};

export const LITURGICAL_TYPES = [
  { value: 'misa', label: 'Misa' },
  { value: 'bautismo', label: 'Bautismo' },
  { value: 'matrimonio', label: 'Matrimonio' },
  { value: 'confirmacion', label: 'Confirmación' },
  { value: 'comunion', label: 'Primera Comunión' },
  { value: 'exequias', label: 'Exequias' },
];
