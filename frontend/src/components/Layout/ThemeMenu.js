// src/components/layout/ThemeMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

const ThemeMenu = () => {
  const { theme, setTheme, palettes } = useTheme();
  const { authFetch, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [canPersist, setCanPersist] = useState(() => {
    try { return localStorage.getItem('prefs-api-available') || 'unknown'; } catch { return 'unknown'; }
  });
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <motion.button
        className="p-2 rounded-lg transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ background: "transparent" }}
        title="Cambiar tema"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Palette className="w-6 h-6" style={{ color: "var(--text)" }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Selector de tema"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-xl border shadow-lg p-3 z-50"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Paletas</p>
            <div className="grid grid-cols-3 gap-2">
              {palettes.map((p) => {
                const active = p.id === theme;
                return (
                  <button
                    key={p.id}
                    onClick={async () => {
                      setTheme(p.id);
                      setOpen(false);
                      // Persistir preferencia en backend si hay usuario autenticado
                      try {
                        if (user) {
                          // Guardar preferencia por-usuario en local inmediatamente
                          try { localStorage.setItem(`app-theme-${user.id}`, p.id); } catch {}
                          if (canPersist !== 'false') {
                            const resp = await authFetch('http://localhost:5000/api/users/me/preferences', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ theme: p.id })
                            });
                            if (resp && resp.status === 404) {
                              try { localStorage.setItem('prefs-api-available', 'false'); } catch {}
                              setCanPersist('false');
                            } else if (resp && resp.ok) {
                              try { localStorage.setItem('prefs-api-available', 'true'); } catch {}
                              setCanPersist('true');
                            }
                          }
                          // Sincronizar localStorage.user para coherencia inmediata (opcional)
                          try {
                            const u = JSON.parse(localStorage.getItem('user')) || {};
                            const prefs = { ...(u.preferences || {}), theme: p.id };
                            localStorage.setItem('user', JSON.stringify({ ...u, preferences: prefs }));
                          } catch {}
                        } else {
                          // Usuario no autenticado: guardar tema global
                          try { localStorage.setItem('app-theme', p.id); } catch {}
                        }
                      } catch (_) {
                        // Silencioso: si falla no rompemos UX de cambio de tema local
                      }
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg border transition-all"
                    title={p.label}
                    role="menuitem"
                    style={{
                      borderColor: active ? "var(--primary)" : "var(--border)",
                      boxShadow: active ? `0 0 0 4px ${hexToRgba(p.primary, 0.07)}` : "none",
                      background: "transparent",
                      color: "var(--text)"
                    }}
                  >
                    <span
                      className="inline-block w-6 h-6 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="text-sm">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// pequeña utilidad para caja de foco (rgba)
function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default ThemeMenu;
