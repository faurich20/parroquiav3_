// src/components/layout/ThemeMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

const ThemeMenu = () => {
  const { theme, setTheme, palettes } = useTheme();
  const [open, setOpen] = useState(false);
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
                    onClick={() => {
                      setTheme(p.id);
                      setOpen(false);
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
