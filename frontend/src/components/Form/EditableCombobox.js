// src/components/Form/EditableCombobox.js
import React from 'react';

/**
 * Combobox editable que permite seleccionar de una lista o escribir un valor nuevo
 * Usa HTML5 datalist para compatibilidad nativa
 */
const EditableCombobox = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = '', 
  disabled = false,
  className = '',
  name = '',
  id = ''
}) => {
  const listId = id ? `${id}-list` : `${name}-list`;

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        list={listId}
        autoComplete="off"
        className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-opacity-50 transition ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
        style={{
          background: disabled ? 'var(--surface-1)' : 'var(--surface-2)',
          color: 'var(--text)',
          border: '1px solid var(--border)'
        }}
      />
      <datalist id={listId}>
        {options.map((option, index) => (
          <option key={option.value || index} value={option.label || option.value}>
            {option.label || option.value}
          </option>
        ))}
      </datalist>
    </div>
  );
};

export default EditableCombobox;
