import React from 'react';
import { Pencil, Trash2, Eye } from 'lucide-react';
import ActionButton from './ActionButton';

export const buildActionColumn = ({ onEdit, onDelete, onView, width = '30%', align = 'center', editTitle = 'Editar', deleteTitle = 'Eliminar', viewTitle = 'Ver más' } = {}) => ({
  key: 'acciones',
  header: 'Acciones',
  width,
  align,
  render: (row) => (
    <div className="flex items-center justify-center gap-2">
      {onEdit ? (
        <ActionButton color="theme" icon={Pencil} onClick={() => onEdit(row)} title={editTitle}>Editar</ActionButton>
      ) : null}
      {onDelete ? (
        <ActionButton color="red" icon={Trash2} onClick={() => onDelete(row)} title={deleteTitle}>Eliminar</ActionButton>
      ) : null}
      {onView ? (
        <ActionButton color="theme" icon={Eye} onClick={() => onView(row)} title={viewTitle}>Ver más</ActionButton>
      ) : null}
    </div>
  )
});
