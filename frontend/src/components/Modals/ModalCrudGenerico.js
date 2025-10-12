// src/components/Modals/ModalCrudGenerico.js
import React, { useEffect, useMemo, useState } from 'react';
import { Save, Loader } from 'lucide-react';
import ModalBase from './ModalBase';

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
  size = 'md'
}) => {
  const [values, setValues] = useState(initialValues);
  const [errores, setErrores] = useState('');
  const [cargando, setCargando] = useState(false);

  const soloLectura = mode === 'view';

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues || {});
      setErrores('');
      setCargando(false);
    }
  }, [isOpen, initialValues, mode]);

  const footer = useMemo(() => {
    if (soloLectura) {
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
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-white hover:text-gray-900"
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
                const err = validate(values);
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
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {cargando ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {mode === 'add' ? 'Crear' : 'Guardar'}
        </button>
      </div>
    );
  }, [cargando, soloLectura, mode, values, validate, onSubmit, onClose]);

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
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <input
              type={campo.type}
              value={value || ''}
              onChange={(e) => setValue(e.target.value)}
              placeholder={campo.placeholder}
              disabled={disabled}
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
        return (
          <div key={campo.name}>
            <label className="block text-sm font-medium text-gray-500 mb-1">{campo.label}</label>
            <select
              value={value || ''}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {(campo.options || []).map((opt) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => renderCampo(f))}
        </div>
      </div>
    </ModalBase>
  );
};

export default ModalCrudGenerico;
