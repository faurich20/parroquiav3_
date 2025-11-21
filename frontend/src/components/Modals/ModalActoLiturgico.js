// src/components/Modals/ModalActoLiturgico.js
import React, { useEffect, useMemo, useState } from 'react';
import { Church } from 'lucide-react';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { ACTO_NOMBRES } from '../../constants/liturgical';

// Misma lógica de agregar 1 hora que usas en ActoLiturgico.js
const deriveEndDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) {
    return { date: dateStr, time: timeStr };
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  if ([year, month, day, hours, minutes].some((n) => Number.isNaN(n))) {
    return { date: dateStr, time: timeStr };
  }

  const base = new Date(year, month - 1, day, hours, minutes, 0);
  if (Number.isNaN(base.getTime())) {
    return { date: dateStr, time: timeStr };
  }

  base.setHours(base.getHours() + 1);
  const pad = (n) => n.toString().padStart(2, '0');
  return {
    date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    time: `${pad(base.getHours())}:${pad(base.getMinutes())}`,
  };
};

// Misma validación de fechas/horas que en ActoLiturgico.js (adaptada)
const validateAct = (v) => {
  if (!v.parroquiaid) return 'Seleccione la parroquia';
  if (!v.act_nombre) return 'Seleccione el acto';
  if (!v.act_titulo || !v.act_titulo.trim()) return 'Ingrese el título';
  if (!v.h_fecha) return 'Ingrese la fecha inicial';
  if (!v.h_hora) return 'Ingrese la hora inicial';

  const defaults = deriveEndDateTime(v.h_fecha, v.h_hora);
  const fechaFin = v.h_fecha_fin || defaults.date;
  const horaFin = v.h_hora_fin || defaults.time;

  try {
    const inicio = new Date(`${v.h_fecha}T${v.h_hora}:00`);
    const fin = new Date(`${fechaFin}T${horaFin}:00`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return 'Fechas u horas inválidas';
    }
    if (fin < inicio) {
      return 'La fecha/hora final debe ser mayor o igual a la inicial';
    }
  } catch {
    return 'Fechas u horas inválidas';
  }

  return '';
};

const ModalActoLiturgico = ({
  isOpen,
  onClose,
  initialValues = {},
  onCreated, // opcional: para que Horarios pueda hacer refetch del calendario
}) => {
  const { authFetch, user } = useAuth();

  const normalizedRole = (user?.role || '').toString().toLowerCase();
  const isAdmin = normalizedRole === 'administrador' || normalizedRole === 'admin';
  const userParroquiaId = user?.persona?.parroquiaid || null;

  const [parroquiaOptions, setParroquiaOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [values, setValues] = useState({
    parroquiaid: '',
    act_nombre: '',
    act_titulo: '',
    act_descripcion: '',
    h_fecha: '',
    h_hora: '',
    h_fecha_fin: '',
    h_hora_fin: '',
    act_estado: true,
  });

  // Cargar parroquias (mismo patrón que ActoLiturgico.js)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await authFetch('http://localhost:5000/api/parroquias');
        if (resp?.ok) {
          const data = await resp.json();
          if (!mounted) return;
          let opts = (data.parroquias || []).map((p) => ({
            value: p.parroquiaid,
            label: p.par_nombre,
          }));

          if (!isAdmin && userParroquiaId) {
            const ownOpt = opts.find(o => o.value === userParroquiaId);
            opts = ownOpt ? [ownOpt] : [];
          }

          setParroquiaOptions(opts);
        }
      } catch {
        // silencioso
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authFetch, isAdmin, userParroquiaId]);

  // Pre-llenar valores cuando abra el modal
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
      today.getDate()
    )}`;

    const nextHour = today.getHours() + 1;
    const timeStr = `${pad(nextHour)}:00`;

    setError('');
    setValues((prev) => ({
      ...prev,
      parroquiaid: (!isAdmin && userParroquiaId)
        ? userParroquiaId
        : (initialValues.parroquiaid ??
          initialValues.parroquia_id ??
          prev.parroquiaid ??
          ''),
      act_nombre: initialValues.act_nombre ?? prev.act_nombre ?? '',
      act_titulo: (initialValues.act_titulo ?? prev.act_titulo) ?? '',
      act_descripcion:
        (initialValues.act_descripcion ?? prev.act_descripcion) ?? '',

      h_fecha: (initialValues.h_fecha ?? prev.h_fecha) || todayStr,
      h_fecha_fin: (initialValues.h_fecha_fin ?? prev.h_fecha_fin) || todayStr,
      h_hora: (initialValues.h_hora ?? prev.h_hora) || timeStr,
      h_hora_fin: (initialValues.h_hora_fin ?? prev.h_hora_fin) || '',

      act_estado:
        typeof initialValues.act_estado === 'boolean'
          ? initialValues.act_estado
          : true,
    }));
  }, [isOpen, initialValues, isAdmin, userParroquiaId]);

  const handleChange = (name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const msg = validateAct(values);
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);

      const payload = { ...values };
      const defaults = deriveEndDateTime(payload.h_fecha, payload.h_hora);
      payload.h_fecha_fin = payload.h_fecha_fin || defaults.date;
      payload.h_hora_fin = payload.h_hora_fin || defaults.time;

      if (payload.parroquiaid !== '' && payload.parroquiaid !== undefined) {
        payload.parroquiaid = Number(payload.parroquiaid);
      }

      // En este modal siempre se crea -> estado true
      payload.act_estado = true;

      const response = await fetch(
        'http://localhost:5000/api/liturgical/actos-con-horario',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
          `Error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      if (data.success) {
        if (onCreated) {
          onCreated(data);
        }
        alert('✅ Acto litúrgico creado con horario correctamente');
        onClose && onClose();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error creando acto con horario desde el modal:', err);
      setError(err.message || 'Error al crear el acto litúrgico');
    } finally {
      setSaving(false);
    }
  };

  const actosOptions = useMemo(
    () => [{ value: '', label: 'Seleccione' }, ...(ACTO_NOMBRES || [])],
    []
  );

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Acto Litúrgico"
      icon={Church}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Parroquia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parroquia
            </label>
            <select
              value={values.parroquiaid || ''}
              onChange={(e) => handleChange('parroquiaid', e.target.value)}
              disabled={!isAdmin && !!userParroquiaId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100"
            >
              <option value="">Seleccione</option>
              {parroquiaOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de acto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acto Litúrgico
            </label>
            <select
              value={values.act_nombre || ''}
              onChange={(e) => handleChange('act_nombre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {actosOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              value={values.act_titulo || ''}
              onChange={(e) => handleChange('act_titulo', e.target.value)}
              placeholder="Ej. Misa dominical"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Descripción */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={values.act_descripcion || ''}
              onChange={(e) =>
                handleChange('act_descripcion', e.target.value)
              }
              placeholder="Observaciones"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-vertical"
            />
          </div>

          {/* Fecha/Hora inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha inicial
            </label>
            <input
              type="date"
              value={values.h_fecha || ''}
              onChange={(e) => handleChange('h_fecha', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora inicial
            </label>
            <input
              type="time"
              value={values.h_hora || ''}
              onChange={(e) => handleChange('h_hora', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Fecha/Hora final (opcionales) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha final (opcional)
            </label>
            <input
              type="date"
              value={values.h_fecha_fin || ''}
              onChange={(e) => handleChange('h_fecha_fin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora final (opcional)
            </label>
            <input
              type="time"
              value={values.h_hora_fin || ''}
              onChange={(e) => handleChange('h_hora_fin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-800 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:brightness-110"
            style={{
              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar Acto'}
          </button>
        </div>
      </form>
    </ModalBase>
  );
};

export default ModalActoLiturgico;
