// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const PALETTES = [
  { id: "blue", label: "Azul", primary: "#2563eb", secondary: "#7c3aed" },
  { id: "green", label: "Verde", primary: "#16a34a", secondary: "#22c55e" },
  { id: "purple", label: "Morado", primary: "#7c3aed", secondary: "#8b5cf6" },
  { id: "wine", label: "Vino", primary: "#7f1d1d", secondary: "#9f1239" },
  { id: "red", label: "Rojo", primary: "#dc2626", secondary: "#ef4444" },
  { id: "sky", label: "Celeste", primary: "#0ea5e9", secondary: "#22d3ee" },
  { id: "black", label: "Negro", primary: "#111827", secondary: "#374151" },
  { id: "yellow", label: "Amarillo", primary: "#eab308", secondary: "#f59e0b" },
  { id: "brown", label: "Marrón", primary: "#92400e", secondary: "#b45309" },
  { id: "white", label: "Blanco", primary: "#e5e7eb", secondary: "#f3f4f6" },
  { id: "gray", label: "Gris", primary: "#6b7280", secondary: "#9ca3af" },
  { id: "teal", label: "Teal", primary: "#0d9488", secondary: "#14b8a6" },
  { id: "indigo", label: "Indigo", primary: "#4f46e5", secondary: "#6366f1" },
  { id: "pink", label: "Pink", primary: "#ec4899", secondary: "#f472b6" },
  { id: "orange", label: "Orange", primary: "#f97316", secondary: "#fb923c" },
  { id: "cyan", label: "Cyan", primary: "#06b6d4", secondary: "#0891b2" },
];

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("app-theme") || "blue";
    } catch (err) {
      return "blue";
    }
  });

  // Aplica al <html data-theme="...">
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("app-theme", theme);
      const pal = PALETTES.find((p) => p.id === theme) || PALETTES[0];
      if (pal) {
        document.documentElement.style.setProperty('--primary', pal.primary);
        document.documentElement.style.setProperty('--secondary', pal.secondary);
        // Ajustes de contraste de superficie/texto según tema
        const isDark = pal.id === 'black';
        if (isDark) {
          document.documentElement.style.setProperty('--surface', '#0b0f19'); // slate-950 aproximado
          document.documentElement.style.setProperty('--surface-2', '#111827'); // slate-800/gray-900
          document.documentElement.style.setProperty('--text', '#f8fafc'); // slate-50
          document.documentElement.style.setProperty('--muted', '#94a3b8'); // slate-400
          document.documentElement.style.setProperty('--border', 'rgba(148, 163, 184, 0.2)');
          document.documentElement.style.setProperty('--background', '#0b0f19');
          // Aplica al body para que TODAS las páginas tengan fondo negro
          document.body.style.backgroundColor = '#0b0f19';
          document.body.style.color = '#f8fafc';
          document.documentElement.style.setProperty('--subtitle', '#f8fafc');
          document.documentElement.style.setProperty('--text-strong', '#ffffff');
        } else {
          document.documentElement.style.setProperty('--surface', '#ffffff');
          document.documentElement.style.setProperty('--surface-2', '#f8fafc');
          document.documentElement.style.setProperty('--text', '#0f172a');
          document.documentElement.style.setProperty('--muted', '#64748b');
          document.documentElement.style.setProperty('--border', 'rgba(15, 23, 42, 0.1)');
          document.documentElement.style.setProperty('--background', '#f8fafc');
          document.body.style.backgroundColor = '#f8fafc';
          document.body.style.color = '#0f172a';
          document.documentElement.style.setProperty('--subtitle', '#64748b');
          document.documentElement.style.setProperty('--text-strong', '#0f172a');
        }
      }
    } catch (err) {
      console.warn("No se pudo aplicar el tema:", err);
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, palettes: PALETTES }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
};
