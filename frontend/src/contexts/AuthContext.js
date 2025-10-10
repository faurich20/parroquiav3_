// import React, { createContext, useContext, useEffect, useState } from 'react';

// const AuthContext = createContext();

// export const useAuth = () => useContext(AuthContext);

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Cargar usuario desde localStorage al inicio y verificar token
//   useEffect(() => {
//     const initializeAuth = async () => {
//       const savedUser = localStorage.getItem('user');
//       const accessToken = localStorage.getItem('access_token');

//       if (savedUser && accessToken) {
//         setUser(JSON.parse(savedUser));

//         // Verificar si el token es válido
//         try {
//           const response = await fetch('http://localhost:5000/api/users/profile', {
//             method: 'GET',
//             headers: {
//               'Authorization': `Bearer ${accessToken}`,
//             },
//           });

//           if (!response.ok) {
//             // Token inválido, intentar refrescar
//             await refreshToken();
//           }
//         } catch (error) {
//           console.error('Error verificando token:', error);
//           await logout();
//         }
//       }
//       setLoading(false);
//     };

//     initializeAuth();
//   }, []);

//   const login = async (email, password) => {
//     try {
//         console.log('🔐 Intentando login con:', email);

//         const response = await fetch('http://localhost:5000/api/auth/login', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ email, password }),
//         });

//         const data = await response.json();
//         console.log('📦 Respuesta del login:', data);

//         if (response.ok) {
//             console.log('✅ Login exitoso. Tokens recibidos:');
//             console.log('Access Token:', data.access_token ? 'SÍ' : 'NO');
//             console.log('Refresh Token:', data.refresh_token ? 'SÍ' : 'NO');
//             console.log('User:', data.user ? 'SÍ' : 'NO');

//             // Guardar en localStorage
//             localStorage.setItem('access_token', data.access_token);
//             localStorage.setItem('refresh_token', data.refresh_token);
//             localStorage.setItem('user', JSON.stringify(data.user));

//             console.log('💾 Token guardado en localStorage:', 
//                 localStorage.getItem('access_token') ? 'SÍ' : 'NO');

//             setUser(data.user);
//             return { success: true, user: data.user };
//         } else {
//             console.log('❌ Error en login:', data.error);
//             return { success: false, error: data.error || 'Error en el login' };
//         }
//     } catch (error) {
//         console.log('🌐 Error de conexión:', error);
//         return { success: false, error: 'Error de conexión con el servidor' };
//     }
//   };

//   const logout = async () => {
//     try {
//       const token = localStorage.getItem('access_token');
//       if (token) {
//         await fetch('http://localhost:5000/api/auth/logout', {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${token}`,
//           },
//         });
//       }
//     } catch (error) {
//       console.error('Error durante logout:', error);
//     } finally {
//       setUser(null);
//       localStorage.removeItem('user');
//       localStorage.removeItem('access_token');
//       localStorage.removeItem('refresh_token');
//     }
//   };

//   const refreshToken = async () => {
//     try {
//       const refreshToken = localStorage.getItem('refresh_token');
//       if (!refreshToken) {
//         await logout();
//         return false;
//       }

//       const response = await fetch('http://localhost:5000/api/auth/refresh', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${refreshToken}`,
//         },
//       });

//       const data = await response.json();

//       if (response.ok) {
//         localStorage.setItem('access_token', data.access_token);
//         // 🔧 Si se genera un nuevo refresh token, reemplazar el anterior
//         if (data.refresh_token) {
//           localStorage.setItem('refresh_token', data.refresh_token);
//         }
//         if (data.user) {
//           setUser(data.user);
//           localStorage.setItem('user', JSON.stringify(data.user));
//         }
//         return true;
//       } else {
//         await logout();
//         return false;
//       }
//     } catch (error) {
//       console.error('Error refrescando token:', error);
//       await logout();
//       return false;
//     }
//   };

//   const hasPermission = (permission) => {
//     if (!user || !user.permissions) return false;
//     return user.permissions.includes(permission);
//   };

//   // Función para hacer requests autenticadas con refresh automático
//   const authFetch = async (url, options = {}) => {
//     let token = localStorage.getItem('access_token');

//     const config = {
//       ...options,
//       headers: {
//         'Content-Type': 'application/json',
//         ...options.headers,
//         'Authorization': `Bearer ${token}`,
//       },
//     };

//     let response = await fetch(url, config);

//     // Si el token expiró, intentar refrescar y reenviar la request
//     if (response.status === 401) {
//       const refreshed = await refreshToken();
//       if (refreshed) {
//         token = localStorage.getItem('access_token');
//         config.headers.Authorization = `Bearer ${token}`;
//         response = await fetch(url, config);
//       }
//     }

//     return response;
//   };

//   return (
//     <AuthContext.Provider value={{ 
//       user, 
//       login, 
//       logout, 
//       hasPermission, 
//       loading,
//       authFetch 
//     }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiring, setSessionExpiring] = useState(false);

  // ⚙️ Ajusta aquí los tiempos (para prueba están en 20s / 30s)
  const WARNING_DELAY = 50 * 1000; // mostrar aviso (ms) -> prueba: 20s
  const TOTAL_DELAY = 60 * 1000;   // cerrar sesión por inactividad (ms) -> prueba: 30s
  const COUNTDOWN_SECONDS = Math.floor((TOTAL_DELAY - WARNING_DELAY) / 1000);

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS); // calculado desde constantes

  const countdownRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const totalSessionTimerRef = useRef(null);
  const sessionExpiringRef = useRef(sessionExpiring);
  useEffect(() => {
    sessionExpiringRef.current = sessionExpiring;
  }, [sessionExpiring]);

  // ========================
  // 🟢 Inicialización de sesión
  // ========================
  useEffect(() => {
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('access_token');

      if (savedUser && accessToken) {
        setUser(JSON.parse(savedUser));

        try {
          const response = await fetch('http://localhost:5000/api/users/profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          if (!response.ok) await refreshToken();
        } catch (error) {
          console.error('Error verificando token:', error);
          await logout();
        }
      }
      setLoading(false);
    };

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
      }
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, []);

  // ========================
  // ⏰ Control de inactividad
  // ========================
  useEffect(() => {
    if (!user) return;

    // resetInactivityTimers definido dentro del effect (se usará por el handler)
    const resetInactivityTimers = () => {
      clearTimeout(inactivityTimerRef.current);
      clearTimeout(totalSessionTimerRef.current);
      clearInterval(countdownRef.current);
      setSessionExpiring(false);
      setCountdown(COUNTDOWN_SECONDS);
      console.log('🔄 Reset timers', new Date().toLocaleTimeString());

      // ⚙️ Después del WARNING_DELAY → mostrar aviso de expiración
      inactivityTimerRef.current = setTimeout(() => {
        setSessionExpiring(true);
        startCountdown();
      }, WARNING_DELAY);

      // ⚙️ Después del TOTAL_DELAY → cerrar sesión automáticamente
      totalSessionTimerRef.current = setTimeout(() => {
        handleAutoLogout();
      }, TOTAL_DELAY);
    };

    const startCountdown = () => {
      console.log('⏳ Mostrando aviso de expiración', new Date().toLocaleTimeString());
      setSessionExpiring(true); // ✅ muestra el modal
      let remaining = COUNTDOWN_SECONDS;
      setCountdown(remaining);

      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownRef.current);
        }
      }, 1000);
    };


    const handleAutoLogout = async () => {
      console.log('🚪 Auto logout triggered', new Date().toLocaleTimeString());
      clearInterval(countdownRef.current);
      setSessionExpiring(false);
      // Llamamos al logout real (envía request al backend y limpia localStorage)
      await logout();
      // Opcional: puedes agregar un console.log para traza
      console.log('⚠️ Sesión cerrada automáticamente por inactividad');
    };

    // Handler de actividad: si ya está apareciendo el aviso, NO reiniciamos timers
    const handleUserActivity = () => {
      console.log('🖱️ Actividad detectada, modal visible?', sessionExpiringRef.current);

      if (sessionExpiringRef.current) return; // ✅ evita reset mientras modal visible
      resetInactivityTimers();
    };


    // Suscribimos eventos de actividad
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    // Inicializamos temporizadores por primera vez
    resetInactivityTimers();

    // Limpieza: remover exactamente las mismas referencias de handler
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);

      clearTimeout(inactivityTimerRef.current);
      clearTimeout(totalSessionTimerRef.current);
      clearInterval(countdownRef.current);
    };
    // ✅ Importante: re-ejecutar este effect cuando 'user' o 'sessionExpiring' cambien
  }, [user]); 

  // ========================
  // 🔁 Extender sesión (invocado por el botón "Mantener sesión")
  // ========================
  const extendSession = () => {
    // limpiamos timers existentes
    clearTimeout(inactivityTimerRef.current);
    clearTimeout(totalSessionTimerRef.current);
    clearInterval(countdownRef.current);

    // ocultamos modal y reiniciamos el contador
    setSessionExpiring(false);
    setCountdown(COUNTDOWN_SECONDS);

    // reiniciamos manualmente los temporizadores (no generamos eventos falsos)
    inactivityTimerRef.current = setTimeout(() => {
      setSessionExpiring(true);
      // arrancar countdown localmente
      let remaining = COUNTDOWN_SECONDS;
      setCountdown(remaining);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) clearInterval(countdownRef.current);
      }, 1000);
    }, WARNING_DELAY);

    totalSessionTimerRef.current = setTimeout(async () => {
      // si llega aquí, finaliza sesión
      clearInterval(countdownRef.current);
      setSessionExpiring(false);
      await logout();
      console.log('⚠️ Sesión cerrada automáticamente por inactividad (desde extendSession timers)');
    }, TOTAL_DELAY);
  };

  // ========================
  // 🔐 Funciones de autenticación (sin cambios)
  // ========================
  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Error en el login' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión con el servidor' };
    }
  };

  const logout = async () => {
  try {
    // 🔹 Cerrar modal de expiración si está visible
    setSessionExpiring(false);

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
    localStorage.setItem('logout_event', Date.now()); // sincroniza otras pestañas
  }
};



  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        await logout();
        return false;
      }

      const response = await fetch('http://localhost:5000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${refreshToken}` },
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return true;
      } else {
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Error refrescando token:', error);
      await logout();
      return false;
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const authFetch = async (url, options = {}) => {
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

    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        token = localStorage.getItem('access_token');
        config.headers.Authorization = `Bearer ${token}`;
        response = await fetch(url, config);
      }
    }

    return response;
  };

  // ========================
  // Render y modal
  // ========================
  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      hasPermission,
      loading,
      authFetch,
      sessionExpiring,
      countdown,
      extendSession
    }}>
      {children}

      {/* 🔔 Modal de expiración */}
      {sessionExpiring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center max-w-sm">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Sesión a punto de expirar</h2>
            <p className="text-gray-600 mb-4">
              Tu sesión se cerrará automáticamente en <b>{countdown}s</b> por inactividad.
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
        </div>
      )}
    </AuthContext.Provider>
  );
};

