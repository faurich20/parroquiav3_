// src/components/Modals/ModalCrudGenerico.js
import React, { useEffect, useMemo, useState } from 'react';
import { Save, Loader } from 'lucide-react';
import ModalBase from './ModalBase';
import { useTheme } from '../../contexts/ThemeContext';

const ModalCrudGenerico = ({
  isOpen,
  mode = 'add',
  title,
  icon,
  initialValues = {},
  fields = [],
  validate,
  onSubmit,
  onClose,
  size = 'xl',
  note,
  readOnlyContent,
}) => {
  const [values, setValues] = useState({});
  const [errores, setErrores] = useState('');
  const [cargando, setCargando] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'black';

  const soloLectura = mode === 'view';

  useEffect(() => {
    if (isOpen) {
      // Crear objeto con valores iniciales, usando defaultValue si no hay initialValue
      const newValues = {};
      fields.forEach(field => {
        const initialValue = initialValues[field.name];
        const defaultValue = field.defaultValue;

        // Prioridad: initialValue > defaultValue > ''
        newValues[field.name] = initialValue !== undefined ? initialValue :
                               (defaultValue !== undefined ? defaultValue : '');
      });

      setValues(newValues);
      setErrores('');
      setCargando(false);
    }
  }, [isOpen, initialValues, fields, mode]);

  const footer = useMemo(() => {
    if (soloLectura) {
      // En modo view con readOnlyContent, no mostrar footer (el botón está dentro del contenido)
      if (readOnlyContent) {
        return null;
      }
      return (
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Cerrar
        </button>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {note ? (
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{note}</div>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black hover:text-gray-900"
            style={isDark ? { background: '#ffffff' } : undefined}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={async () => {
              try {
                setErrores('');
                if (typeof validate === 'function') {
                  const maybe = validate(values);
                  const err = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
                  if (err) { setErrores(err); return; }
                }
                setCargando(true);
                const resp = await onSubmit?.(values);
                if (resp?.success) onClose?.();
                else setErrores(resp?.error || 'Error al guardar');
              } catch (e) {
                setErrores(e.message || 'Error al guardar');
              } finally {
                setCargando(false);
              }
            }}
            className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
          >
            {cargando ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {mode === 'add' ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    );
  }, [cargando, soloLectura, mode, values, validate, onSubmit, onClose, note, isDark, readOnlyContent]);

  const renderCampo = (campo) => {
    const value = values[campo.name];
    const setValue = (v) => setValues(prev => ({ ...prev, [campo.name]: v }));
    const disabled = soloLectura || campo.disabled;

    if (campo.type === 'custom' && typeof campo.render === 'function') {
      return campo.render(value, setValue, values, disabled);
    }

    switch (campo.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'date':
      case 'time':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <input
              type={campo.type}
              defaultValue={campo.defaultValue || (initialValues[campo.name] || '')}
              onChange={(e) => {
                setValue(e.target.value);
                // Si este campo es una dependencia de otro, limpiar los campos dependientes
                fields.forEach(f => {
                  if (f.dependsOn === campo.name) {
                    setValues(prev => ({ ...prev, [f.name]: '' }));
                  }
                });
              }}
              placeholder={campo.placeholder}
              disabled={disabled}
              min={campo.min}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <textarea
              value={value || ''}
              onChange={(e) => setValue(e.target.value)}
              placeholder={campo.placeholder}
              disabled={disabled}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        );
      case 'select':
        // Si el campo depende de otro, filtrar las opciones dinámicamente
        let selectOptions = campo.options || [];
        if (campo.dependsOn && campo.optionsFilter && typeof campo.optionsFilter === 'function') {
          const dependValue = values[campo.dependsOn];
          const filteredOptions = campo.optionsFilter(dependValue);
          selectOptions = [{ value: '', label: campo.placeholder || 'Seleccione una opción' }, ...filteredOptions];
        }
        
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <select
              value={value || ''}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled || (campo.dependsOn && !values[campo.dependsOn])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {selectOptions.map((opt) => (
                <option key={String(opt.value ?? opt)} value={opt.value ?? opt}>
                  {opt.label ?? opt}
                </option>
              ))}
            </select>
          </div>
        );
      case 'checkbox':
        return (
          <label key={campo.name} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setValue(e.target.checked)}
              disabled={disabled}
            />
            <span>{campo.label}</span>
          </label>
        );
      case 'combobox':
        const listId = `${campo.name}-datalist`;
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => setValue(e.target.value)}
              placeholder={campo.placeholder}
              disabled={disabled}
              list={listId}
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <datalist id={listId}>
              {(campo.options || []).map((opt, idx) => (
                <option key={opt.value || idx} value={opt.label || opt.value}>
                  {opt.label || opt.value}
                </option>
              ))}
            </datalist>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      title={title}
      icon={icon}
      onClose={onClose}
      size={size}
      closeOnOverlay={false}
      footer={footer}
    >
      <div className="p-6">
        {errores ? (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{errores}</div>
        ) : null}
        {soloLectura && typeof readOnlyContent === 'function' ? (
          <div className="space-y-4">{readOnlyContent(values)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => renderCampo(f))}
          </div>
        )}
      </div>
    </ModalBase>
  );
};

export default ModalCrudGenerico;
