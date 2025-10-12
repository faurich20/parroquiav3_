import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTheme } from './ThemeContext';
import { createPortal } from 'react-dom';

const AuthContext = createContext();
// Evita re-render de la app cuando el Provider cambia estado interno no relevante
const ChildrenContainer = React.memo(({ children }) => <>{children}</>);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const { setTheme } = useTheme();

  // ⚙️ CONFIGURACIÓN DE TIEMPOS (más legible)
  // Formato: { minutos: X, segundos: Y }
  const TIEMPO_CONFIG = {
  TOKEN_DURACION: { minutos: 1, segundos: 0 },      // Igual que backend
  REFRESH_ANTICIPADO: { minutos: 0, segundos: 10 }, // 10s antes de expirar
  AVISO_INACTIVIDAD: { minutos: 0, segundos: 45 },  // Aviso a los 45s
  LOGOUT_INACTIVIDAD: { minutos: 1, segundos: 0 }   // Logout a 1 min
};

  // 🔧 Función helper para convertir a milisegundos
  const aMs = (config) => (config.minutos * 60 + config.segundos) * 1000;

  // Constantes calculadas (NO MODIFICAR)
  const ACCESS_TOKEN_LIFETIME = aMs(TIEMPO_CONFIG.TOKEN_DURACION);
  const REFRESH_BEFORE_EXPIRY = aMs(TIEMPO_CONFIG.REFRESH_ANTICIPADO);
  const INACTIVITY_WARNING = aMs(TIEMPO_CONFIG.AVISO_INACTIVIDAD);
  const INACTIVITY_TIMEOUT = aMs(TIEMPO_CONFIG.LOGOUT_INACTIVIDAD);
  const COUNTDOWN_SECONDS = Math.floor((INACTIVITY_TIMEOUT - INACTIVITY_WARNING) / 1000);

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  // 🔒 REFS para control de estado y prevención de race conditions
  const countdownRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const totalSessionTimerRef = useRef(null);
  const sessionExpiringRef = useRef(sessionExpiring);
  const refreshTimerRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef(null);
  const tokenExpiryTimeRef = useRef(null);
  const lastActivityTimeRef = useRef(0);
  const didInitRef = useRef(false);

  useEffect(() => {
    sessionExpiringRef.current = sessionExpiring;
  }, [sessionExpiring]);

  // ========================
  // 🟢 Inicialización de sesión (con guardia StrictMode + cache perfil)
  // ========================
  useEffect(() => {
    if (!window.__profileCache) window.__profileCache = { value: null, expiry: 0 };
    if (!window.__profileInFlight) window.__profileInFlight = null;

    const initializeAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('access_token');

      if (savedUser && accessToken) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          // Aplica tema desde preferencias guardadas del usuario (si existen)
          if (parsed?.preferences?.theme) {
            setTheme(parsed.preferences.theme);
          } else if (parsed?.id) {
            // Si no hay preferencia en backend, usar la guardada por usuario en local
            const perUser = localStorage.getItem(`app-theme-${parsed.id}`);
            if (perUser) setTheme(perUser);
          }
        } catch {}
        
        // Establecer tiempo de expiración del token
        const tokenExpiry = localStorage.getItem('token_expiry');
        if (tokenExpiry) {
          tokenExpiryTimeRef.current = parseInt(tokenExpiry);
          scheduleTokenRefresh();
        }

        try {
          const now = Date.now();
          const cache = window.__profileCache;
          if (cache.value && cache.expiry > now) {
            const perfil = cache.value;
            setUser(perfil);
            localStorage.setItem('user', JSON.stringify(perfil));
            if (perfil?.preferences?.theme) {
              setTheme(perfil.preferences.theme);
            } else if (perfil?.id) {
              const perUser = localStorage.getItem(`app-theme-${perfil.id}`);
              if (perUser) setTheme(perUser);
            }
          } else {
            if (window.__profileInFlight) {
              await window.__profileInFlight; // esperar a la petición en curso
            } else {
              window.__profileInFlight = (async () => {
                const response = await fetch('http://localhost:5000/api/users/profile', {
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${accessToken}` },
                });
                if (!response.ok) {
                  await refreshToken();
                } else {
                  const data = await response.json();
                  const perfil = data?.user || data;
                  if (perfil) {
                    window.__profileCache = { value: perfil, expiry: Date.now() + 60000 };
                  }
                }
              })();
              try { await window.__profileInFlight; } finally { window.__profileInFlight = null; }
            }
            // aplicar desde cache si se llenó
            if (window.__profileCache.value) {
              const perfil = window.__profileCache.value;
              setUser(perfil);
              localStorage.setItem('user', JSON.stringify(perfil));
              if (perfil?.preferences?.theme) {
                setTheme(perfil.preferences.theme);
              } else if (perfil?.id) {
                const perUser = localStorage.getItem(`app-theme-${perfil.id}`);
                if (perUser) setTheme(perUser);
              }
            }
          }
        } catch (error) {
          console.error('Error verificando token:', error);
          await logout();
        }
      }
      setLoading(false);
    };

    if (didInitRef.current) return;
    didInitRef.current = true;
    initializeAuth();
  }, []);

  // ========================
  // 🔁 Sincronizar logout entre pestañas
  // ========================
  useEffect(() => {
    const syncLogout = (e) => {
      if (e.key === 'logout_event') {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiry');
        // NO usar navigate aquí, ProtectedRoutes lo manejará
      }
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, []);

  // ========================
  // 🔄 REFRESH PROACTIVO (antes de que expire)
  // ========================
  const scheduleTokenRefresh = () => {
    // Limpiar timer anterior
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const expiryTime = tokenExpiryTimeRef.current;
    if (!expiryTime) return;

    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    const timeUntilRefresh = timeUntilExpiry - REFRESH_BEFORE_EXPIRY;

    console.log(`🕐 Token expira en: ${Math.round(timeUntilExpiry / 1000)}s`);
    console.log(`🔄 Programando refresh en: ${Math.round(timeUntilRefresh / 1000)}s`);

    // Solo programar refresh si tiene sentido (token aún válido y no cerca de expirar)
    if (timeUntilRefresh > 0 && timeUntilExpiry > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        console.log('🔄 Ejecutando refresh proactivo...');
        const success = await refreshToken();
        
        // Si el refresh falla, no programar otro (evita loop infinito)
        if (!success) {
          console.log('❌ Refresh falló, no se programa otro');
        }
      }, timeUntilRefresh);
    } else if (timeUntilExpiry > 0 && timeUntilExpiry <= REFRESH_BEFORE_EXPIRY) {
      // Token está muy cerca de expirar, refresh inmediato
      console.log('⚠️ Token muy cerca de expirar, refresh inmediato');
      refreshToken();
    } else {
      // Token ya expiró
      console.log('⚠️ Token ya expiró');
    }
  };

  // ========================
  // 🔒 REFRESH CON LOCK (evita múltiples llamadas simultáneas)
  // ========================
  const refreshToken = async () => {
    // Si ya hay un refresh en progreso, esperar a que termine
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      console.log('⏳ Refresh en progreso, esperando...');
      return refreshPromiseRef.current;
    }

    // Marcar que estamos haciendo refresh
    isRefreshingRef.current = true;
    
    refreshPromiseRef.current = (async () => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          console.log('❌ No hay refresh token');
          await logout();
          return false;
        }

        console.log('🔄 Ejecutando refresh token...');
        const response = await fetch('http://localhost:5000/api/auth/refresh', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${refreshToken}` },
        });

        const data = await response.json();

        if (response.ok) {
          console.log('✅ Refresh exitoso');
          
          // Guardar nuevos tokens
          localStorage.setItem('access_token', data.access_token);
          
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          
          // Calcular y guardar tiempo de expiración
          const expiryTime = Date.now() + ACCESS_TOKEN_LIFETIME;
          localStorage.setItem('token_expiry', expiryTime.toString());
          tokenExpiryTimeRef.current = expiryTime;
          
          if (data.user) {
            // Evitar reiniciar timers por cambios de referencia del usuario durante refresh
            if (!user) {
              setUser(data.user);
              localStorage.setItem('user', JSON.stringify(data.user));
            }
          }

          // ✅ CRÍTICO: Solo programar próximo refresh si NO es un refresh proactivo repetitivo
          // El próximo refresh se programará solo cuando sea necesario (por authFetch o nuevo login)
          console.log('✅ Token renovado, NO se programa refresh automático adicional');
          
          return true;
        } else {
          console.log('❌ Refresh falló:', data.error);
          await logout();
          return false;
        }
      } catch (error) {
        console.error('❌ Error en refresh:', error);
        await logout();
        return false;
      } finally {
        // Liberar el lock
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  // ========================
  // ⏰ Control de inactividad (SEPARADO del refresh de token)
  // ========================
  useEffect(() => {
    if (!user) return;

    const resetInactivityTimers = () => {
      // NO resetear si el modal ya está visible
      if (sessionExpiringRef.current) return;

      clearTimeout(inactivityTimerRef.current);
      clearTimeout(totalSessionTimerRef.current);
      clearInterval(countdownRef.current);
      setSessionExpiring(false);
      setCountdown(COUNTDOWN_SECONDS);

      console.log('🔄 Reset timers de inactividad', new Date().toLocaleTimeString());

      // Timer para mostrar aviso
      inactivityTimerRef.current = setTimeout(() => {
        console.log('⏳ Mostrando aviso de inactividad');
        setSessionExpiring(true);
        // No iniciar conteo visual para evitar re-renders constantes
      }, INACTIVITY_WARNING);

      // Timer para logout automático
      totalSessionTimerRef.current = setTimeout(() => {
        console.log('🚪 Timeout alcanzado, cerrando sesión');
        handleAutoLogout();
      }, INACTIVITY_TIMEOUT);
    };

    const startCountdown = () => {
      // Eliminado conteo visual para evitar re-render de toda la app
      // El cierre automático lo maneja totalSessionTimerRef
      clearInterval(countdownRef.current);
    };

    const handleAutoLogout = async () => {
      console.log('🚪 Logout automático por inactividad');
      clearInterval(countdownRef.current);
      setSessionExpiring(false);
      await logout();
    };

    const handleUserActivity = () => {
      // Si el modal está visible, NO resetear
      if (sessionExpiringRef.current) {
        console.log('⚠️ Modal visible, ignorando actividad');
        return;
      }
      // Throttle de eventos de actividad para evitar ráfagas (mousemove/scroll)
      const now = Date.now();
      if (now - lastActivityTimeRef.current < 1000) return;
      lastActivityTimeRef.current = now;
      resetInactivityTimers();
    };

    // Suscribir eventos de actividad
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    // Inicializar timers
    resetInactivityTimers();

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);

      clearTimeout(inactivityTimerRef.current);
      clearTimeout(totalSessionTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [!!user]);

  // ========================
  // 🔁 Extender sesión (botón "Mantener sesión")
  // ========================
  const extendSession = useCallback(() => {
    console.log('✅ Usuario extendió la sesión manualmente');
    
    // Ocultar modal y resetear countdown
    setSessionExpiring(false);
    setCountdown(COUNTDOWN_SECONDS);
    
    // Limpiar timers de inactividad
    clearTimeout(inactivityTimerRef.current);
    clearTimeout(totalSessionTimerRef.current);
    clearInterval(countdownRef.current);

    // Reiniciar timers desde cero
    console.log('🔄 Reiniciando timers de inactividad');
    
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏳ Mostrando aviso de inactividad');
      setSessionExpiring(true);
      // Sin conteo visual
    }, INACTIVITY_WARNING);

    totalSessionTimerRef.current = setTimeout(async () => {
      console.log('🚪 Timeout alcanzado después de extender sesión');
      clearInterval(countdownRef.current);
      setSessionExpiring(false);
      await logout();
    }, INACTIVITY_TIMEOUT);
  }, [INACTIVITY_WARNING, INACTIVITY_TIMEOUT]);

  // ========================
  // 🔐 Login
  // ========================
  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Guardar tiempo de expiración
        const expiryTime = Date.now() + ACCESS_TOKEN_LIFETIME;
        localStorage.setItem('token_expiry', expiryTime.toString());
        tokenExpiryTimeRef.current = expiryTime;
        
        setUser(data.user);
        // Aplicar tema preferido del usuario si existe, si no la preferencia por-usuario local
        if (data.user?.preferences?.theme) {
          setTheme(data.user.preferences.theme);
        } else if (data.user?.id) {
          const perUser = localStorage.getItem(`app-theme-${data.user.id}`);
          if (perUser) setTheme(perUser); else setTheme('blue');
        }
        
        // Programar refresh proactivo
        scheduleTokenRefresh();
        
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Error en el login' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión con el servidor' };
    }
  }, [ACCESS_TOKEN_LIFETIME, setTheme]);

  // ========================
  // 🚪 Logout
  // ========================
  const logout = useCallback(async () => {
    try {
      setSessionExpiring(false);
      
      // Limpiar todos los timers
      clearTimeout(refreshTimerRef.current);
      clearTimeout(inactivityTimerRef.current);
      clearTimeout(totalSessionTimerRef.current);
      clearInterval(countdownRef.current);

      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Error durante logout:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
      // Resetear tema general para no arrastrar color entre cuentas
      try {
        setTheme('blue');
        localStorage.setItem('app-theme', 'blue');
      } catch {}
      localStorage.setItem('logout_event', Date.now());
      
      // Resetear refs
      isRefreshingRef.current = false;
      refreshPromiseRef.current = null;
      tokenExpiryTimeRef.current = null;
      
      // ProtectedRoutes en App.js detectará user=null y redirigirá a /login
    }
  }, []);

  // ========================
  // 🔑 hasPermission
  // ========================
  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  // ========================
  // 🌐 authFetch con lock anti-race-condition
  // ========================
  const authFetch = useCallback(async (url, options = {}) => {
    let token = localStorage.getItem('access_token');

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    };

    let response = await fetch(url, config);

    // Si el token expiró (401), intentar refresh UNA VEZ
    if (response.status === 401) {
      console.log('🔄 Token expirado, intentando refresh...');
      
      const refreshed = await refreshToken();
      
      if (refreshed) {
        // Reintentar request con nuevo token
        token = localStorage.getItem('access_token');
        config.headers.Authorization = `Bearer ${token}`;
        response = await fetch(url, config);
      }
    }

    return response;
  }, []);

  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    hasPermission,
    loading,
    authFetch,
    extendSession
  }), [user, login, logout, hasPermission, loading, authFetch, extendSession]);

  return (
    <AuthContext.Provider value={contextValue}>
      <ChildrenContainer>{children}</ChildrenContainer>

      {/* 🔔 Modal de inactividad en Portal para aislar del árbol principal */}
      {sessionExpiring && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center max-w-sm">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">
              Sesión a punto de expirar
            </h2>
            <p className="text-gray-600 mb-4">
              Tu sesión se cerrará automáticamente en {COUNTDOWN_SECONDS} segundos por inactividad.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={extendSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Mantener sesión
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                Cerrar ahora
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AuthContext.Provider>
  );
};