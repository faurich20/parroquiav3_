// src/components/Modals/ParroquiaModal.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Church, Loader, Save } from 'lucide-react';
import ModalBase from './ModalBase';

const ParroquiaModal = ({ isOpen, mode = 'add', parroquia, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    par_nombre: '',
    par_direccion: '',
    departamentoid: '',
    par_telefono1: '',
    par_telefono2: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' || mode === 'view') {
      setFormData({
        par_nombre: parroquia?.par_nombre || '',
        par_direccion: parroquia?.par_direccion || '',
        departamentoid: parroquia?.departamentoid ? String(parroquia.departamentoid) : '',
        par_telefono1: parroquia?.par_telefono1 || '',
        par_telefono2: parroquia?.par_telefono2 || ''
      });
    } else {
      setFormData({
        par_nombre: '',
        par_direccion: '',
        departamentoid: '',
        par_telefono1: '',
        par_telefono2: ''
      });
    }
    setError('');
  }, [isOpen, mode, parroquia]);

  const validate = () => {
    if (!formData.par_nombre.trim()) return 'Ingrese el nombre';
    if (!formData.par_direccion.trim()) return 'Ingrese la dirección';
    if (!formData.par_telefono1.trim()) return 'Ingrese el teléfono principal';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const err = validate();
      if (err) { setError(err); return; }
      const payload = {
        par_nombre: formData.par_nombre.trim(),
        par_direccion: formData.par_direccion.trim(),
        par_telefono1: formData.par_telefono1.trim(),
        par_telefono2: formData.par_telefono2.trim(),
        departamentoid: formData.departamentoid ? Number(formData.departamentoid) : undefined
      };
      const resp = await onSubmit?.(payload);
      if (resp?.success) onClose?.();
      else setError(resp?.error || 'Error al guardar');
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'add' ? 'Nueva Parroquia' : mode === 'edit' ? 'Editar Parroquia' : 'Detalle de Parroquia';
  const isReadOnly = mode === 'view';

  const footer = useMemo(() => {
    if (isReadOnly) {
      return (
        <button onClick={onClose} className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
          Cerrar
        </button>
      );
    }
    return (
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-white hover:text-gray-900">
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (formRef.current) {
              try { formRef.current.requestSubmit(); } catch { formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
            }
          }}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {mode === 'add' ? 'Crear' : 'Guardar'}
        </button>
      </div>
    );
  }, [isReadOnly, onClose, loading, mode]);

  if (!isOpen) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      title={title}
      icon={Church}
      onClose={onClose}
      size="xl"
      closeOnOverlay={false}
      footer={footer}
    >
      {isReadOnly ? (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 border rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-2">Nombre</label>
              <span className="text-gray-900">{formData.par_nombre || '—'}</span>
            </div>
            <div className="bg-white p-4 border rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-2">Dirección</label>
              <span className="text-gray-900">{formData.par_direccion || '—'}</span>
            </div>
            <div className="bg-white p-4 border rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-2">Departamento ID</label>
              <span className="text-gray-900">{formData.departamentoid || '—'}</span>
            </div>
            <div className="bg-white p-4 border rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-2">Teléfono 1</label>
              <span className="text-gray-900">{formData.par_telefono1 || '—'}</span>
            </div>
            <div className="bg-white p-4 border rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-2">Teléfono 2</label>
              <span className="text-gray-900">{formData.par_telefono2 || '—'}</span>
            </div>
          </div>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="p-6">
          {error ? <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.par_nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, par_nombre: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Nombre de la parroquia"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Dirección *</label>
              <input
                type="text"
                value={formData.par_direccion}
                onChange={(e) => setFormData(prev => ({ ...prev, par_direccion: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Dirección"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Departamento ID</label>
              <input
                type="number"
                value={formData.departamentoid}
                onChange={(e) => setFormData(prev => ({ ...prev, departamentoid: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="ID de departamento"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Teléfono 1 *</label>
              <input
                type="text"
                value={formData.par_telefono1}
                onChange={(e) => setFormData(prev => ({ ...prev, par_telefono1: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Teléfono principal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Teléfono 2</label>
              <input
                type="text"
                value={formData.par_telefono2}
                onChange={(e) => setFormData(prev => ({ ...prev, par_telefono2: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Teléfono alterno (opcional)"
              />
            </div>
          </div>
        </form>
      )}
    </ModalBase>
  );
};

export default ParroquiaModal;
