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
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [values, setValues] = useState({});
  const [errores, setErrores] = useState('');
  const [cargando, setCargando] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'black';

  const soloLectura = mode === 'view';

  useEffect(() => {
    if (isOpen) {
      const hasExistingValues = Object.values(values).some(val => val !== '' && val !== null && val !== undefined);

      if (hasExistingValues) {
        setErrores('');
        setCargando(false);
        return;
      }

      const newValues = {};
      fields.forEach(field => {
        let initialValue;

        if (typeof field.getInitialValue === 'function') {
          initialValue = field.getInitialValue();
        } else {
          initialValue = initialValues[field.name];
          if (initialValue === undefined) {
            initialValue = field.defaultValue !== undefined ? field.defaultValue : '';
          }
        }

        newValues[field.name] = initialValue;
      });

      setValues(newValues);
      setErrores('');
      setCargando(false);
    } else {
      setValues({});
      setErrores('');
      setCargando(false);
    }
  }, [isOpen, initialValues, fields, mode]);

  const footer = useMemo(() => {
    if (soloLectura) {
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
  }, [cargando, soloLectura, mode, values, validate, onSubmit, onClose, note, isDark, readOnlyContent, renderTrigger]);

  const renderCampo = (campo) => {
    const value = values[campo.name];
    const setValue = (v) => {
      setValues(prev => ({ ...prev, [campo.name]: v }));
      setRenderTrigger(prev => prev + 1);
    };
    const disabled = soloLectura || campo.disabled;

    // ✅ FIX: Agregar key única basada en el nombre del campo
    const fieldKey = `field-${campo.name}-${mode}`;

    if (campo.type === 'custom' && typeof campo.render === 'function') {
      return <div key={fieldKey}>{campo.render(value, setValue, values, disabled)}</div>;
    }

    switch (campo.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'date':
      case 'time':
        return (
          <div key={fieldKey}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <input
              type={campo.type}
              value={value || ''}
              onChange={(e) => {
                setValue(e.target.value);
                fields.forEach(f => {
                  if (f.dependsOn && values[f.dependsOn]) {
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
          <div key={fieldKey}>
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
        let selectOptions = campo.options || [];
        if (campo.dependsOn && campo.optionsFilter && typeof campo.optionsFilter === 'function') {
          const dependsOnArray = Array.isArray(campo.dependsOn) ? campo.dependsOn : [campo.dependsOn];
          const dependValues = dependsOnArray.reduce((acc, dep) => {
            acc[dep] = (values || {})[dep];
            return acc;
          }, {});

          const hasAllDependencies = dependsOnArray.every(dep => dependValues[dep]);
          if (hasAllDependencies) {
            const filteredOptions = campo.optionsFilter(dependValues[dependsOnArray[0]], values || {});
            selectOptions = [{ value: '', label: campo.placeholder || 'Seleccione una opción' }, ...filteredOptions];
          }
        }

        return (
          <div key={fieldKey}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <select
              value={value || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                setValue(newValue);

                if (campo.name === 'parroquiaid' || campo.name === 'h_fecha') {
                  setValues(prev => {
                    const updated = { ...prev, [campo.name]: newValue };
                    if (campo.name === 'parroquiaid' || campo.name === 'h_fecha') {
                      updated.horarioid = '';
                    }
                    return updated;
                  });
                }

                fields.forEach(f => {
                  if (f.dependsOn) {
                    const fieldDependsOnArray = Array.isArray(f.dependsOn) ? f.dependsOn : [f.dependsOn];
                    const dependsOnChangedField = fieldDependsOnArray.some(dep => dep === campo.name);
                    if (dependsOnChangedField) {
                      setValues(prev => ({ ...prev, [f.name]: '' }));
                    }
                  }
                });

                setRenderTrigger(prev => prev + 1);
              }}
              disabled={disabled || (campo.dependsOn && (() => {
                const dependsOnArray = Array.isArray(campo.dependsOn) ? campo.dependsOn : [campo.dependsOn];
                return !dependsOnArray.every(dep => (values || {})[dep]);
              })())}
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
          <label key={fieldKey} className="flex items-center gap-2 text-sm">
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
          <div key={fieldKey}>
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
            {/* ✅ FIX: Ahora cada campo tiene su key única */}
            {fields.map((f) => renderCampo(f))}
          </div>
        )}
      </div>
    </ModalBase>
  );
};

export default ModalCrudGenerico;