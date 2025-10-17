// src/components/Modals/ActoLiturgicoModal.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Loader, Church } from 'lucide-react';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { ACTO_NOMBRES } from '../../constants/liturgical';

const ActoLiturgicoModal = ({ isOpen, mode = 'add', act, onClose, onSubmit }) => {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parroquias, setParroquias] = useState([]);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    parroquiaid: '',
    act_nombre: '',
    act_titulo: '',
    act_fecha: '',
    act_hora: '',
    act_descripcion: '',
    act_estado: true,
  });

  // Cargar parroquias cuando abre
  useEffect(() => {
    const cargarParroquias = async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/parroquias');
        if (!resp.ok) return;
        const data = await resp.json();
        const lista = Array.isArray(data.parroquias) ? data.parroquias : [];
        setParroquias(lista);
        if (!act && lista.length === 1) {
          setFormData(prev => ({ ...prev, parroquiaid: String(lista[0].parroquiaid) }));
        }
      } catch {}
    };
    if (isOpen) cargarParroquias();
  }, [isOpen, authFetch, act]);

  // Inicializar/limpiar al cambiar modo/acto
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' || mode === 'view') {
        setFormData({
          parroquiaid: act?.parroquiaid ? String(act.parroquiaid) : '',
          act_nombre: act?.act_nombre || '',
          act_titulo: act?.act_titulo || '',
          act_fecha: act?.act_fecha || '',
          act_hora: act?.act_hora || '',
          act_descripcion: act?.act_descripcion || '',
          act_estado: !!act?.act_estado,
        });
      } else {
        setFormData({
          parroquiaid: '',
          act_nombre: '',
          act_titulo: '',
          act_fecha: '',
          act_hora: '',
          act_descripcion: '',
          act_estado: true,
        });
      }
      setError('');
    }
  }, [isOpen, mode, act]);

  const validate = () => {
    if (!formData.parroquiaid) return 'Seleccione la parroquia';
    if (!formData.act_nombre) return 'Seleccione el acto';
    if (!formData.act_titulo.trim()) return 'Ingrese el título';
    if (!formData.act_fecha) return 'Ingrese la fecha';
    if (!formData.act_hora) return 'Ingrese la hora';
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
        parroquiaid: formData.parroquiaid ? Number(formData.parroquiaid) : null,
        act_nombre: formData.act_nombre,
        act_titulo: formData.act_titulo.trim(),
        act_fecha: formData.act_fecha,
        act_hora: formData.act_hora,
        act_descripcion: formData.act_descripcion?.trim() || '',
        act_estado: !!formData.act_estado,
      };
      const result = await onSubmit?.(payload);
      if (result?.success) onClose?.();
      else setError(result?.error || 'Error al procesar la solicitud');
    } catch (e) {
      setError(e.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'add': return 'Nuevo Acto Litúrgico';
      case 'edit': return 'Editar Acto Litúrgico';
      case 'view': return 'Detalle del Acto';
      default: return 'Acto Litúrgico';
    }
  };

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
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-white hover:text-gray-900"
        >
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
      title={getModalTitle()}
      icon={Church}
      onClose={onClose}
      closeOnOverlay={false}
      size="xl"
      footer={footer}
    >
      {isReadOnly ? (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-white p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-500 mb-2">Parroquia</label>
                <span className="text-gray-900">{act?.parroquia_nombre || parroquias.find(p => String(p.parroquiaid) === String(formData.parroquiaid))?.par_nombre || '—'}</span>
              </div>
              <div className="bg-white p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-500 mb-2">Acto</label>
                <span className="text-gray-900">{(ACTO_NOMBRES.find(a => a.value === formData.act_nombre)?.label) || formData.act_nombre || '—'}</span>
              </div>
              <div className="bg-white p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-500 mb-2">Título</label>
                <span className="text-gray-900">{formData.act_titulo || '—'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-500 mb-2">Fecha</label>
                <span className="text-gray-900">{formData.act_fecha || '—'}</span>
              </div>
              <div className="bg-white p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-500 mb-2">Hora</label>
                <span className="text-gray-900">{formData.act_hora || '—'}</span>
              </div>
              <div className="bg-white p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-500 mb-2">Estado</label>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${formData.act_estado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {formData.act_estado ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 border rounded-lg">
            <label className="block text-sm font-medium text-gray-500 mb-2">Descripción</label>
            <p className="text-gray-900 whitespace-pre-wrap">{formData.act_descripcion || '—'}</p>
          </div>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="p-6">
          {error ? (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Parroquia *</label>
              <select
                value={formData.parroquiaid}
                onChange={(e) => setFormData(prev => ({ ...prev, parroquiaid: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Seleccione</option>
                {parroquias.map(p => (
                  <option key={p.parroquiaid} value={p.parroquiaid}>{p.par_nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Acto *</label>
              <select
                value={formData.act_nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, act_nombre: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Seleccione</option>
                {ACTO_NOMBRES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Título *</label>
              <input
                type="text"
                value={formData.act_titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, act_titulo: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Ej. Misa dominical"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Fecha *</label>
              <input
                type="date"
                value={formData.act_fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, act_fecha: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Hora *</label>
              <input
                type="time"
                value={formData.act_hora}
                onChange={(e) => setFormData(prev => ({ ...prev, act_hora: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Descripción</label>
              <textarea
                value={formData.act_descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, act_descripcion: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Observaciones"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!formData.act_estado}
                onChange={(e) => setFormData(prev => ({ ...prev, act_estado: e.target.checked }))}
              />
              <span>Activo</span>
            </label>
          </div>
        </form>
      )}
    </ModalBase>
  );
};

export default ActoLiturgicoModal;
