import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Church, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/bienvenida');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Limpiar error al cambiar campos
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, var(--surface), var(--surface-2))"
      }}
    >
      <motion.div
        className="rounded-3xl shadow-2xl p-8 w-full max-w-md"
        style={{ background: "var(--surface)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--secondary))"
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Church className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
            SisParroquia
          </h1>
          <p style={{ color: "var(--muted)" }}>Sistema de Gestión Parroquial</p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-red-700 bg-red-100 border border-red-300">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl transition-colors"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)"
              }}
              placeholder="correo@parroquia.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl transition-colors pr-12"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                style={{ color: "var(--muted)" }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: "linear-gradient(90deg, var(--primary), var(--secondary))",
              color: "#fff"
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Iniciar Sesión
              </>
            )}
          </motion.button>
        </form>

        {/* Recuperar contraseña */}
        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            ¿Olvidaste tu contraseña?{' '}
            <button
              className="font-medium"
              style={{ color: "var(--primary)" }}
            >
              Recuperar
            </button>
          </p>
        </div>

        {/* Credenciales de prueba */}
        <div className="mt-6 p-4 rounded-lg" style={{ background: "var(--surface-2)" }}>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
            Credenciales de prueba:
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Email: admin@parroquia.com<br />
            Contraseña: Admin123!
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginForm;