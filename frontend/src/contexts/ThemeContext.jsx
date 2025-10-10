// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const PALETTES = [
  { id: "blue", label: "Azul", primary: "#2563eb", secondary: "#7c3aed" },
  { id: "green", label: "Verde", primary: "#16a34a", secondary: "#22c55e" },
  { id: "purple", label: "Morado", primary: "#7c3aed", secondary: "#8b5cf6" },
  { id: "wine", label: "Vino", primary: "#7f1d1d", secondary: "#9f1239" },
  { id: "red", label: "Rojo", primary: "#dc2626", secondary: "#ef4444" },
  { id: "sky", label: "Celeste", primary: "#0ea5e9", secondary: "#22d3ee" },
  { id: "black", label: "Negro", primary: "#06b6d4", secondary: "#6366f1" },
  { id: "yellow", label: "Amarillo", primary: "#eab308", secondary: "#f59e0b" },
  { id: "brown", label: "Marrón", primary: "#92400e", secondary: "#b45309" },
  { id: "white", label: "Blanco", primary: "#0ea5e9", secondary: "#7c3aed" },
  { id: "gray", label: "Gris", primary: "#6b7280", secondary: "#9ca3af" },
  { id: "teal", label: "Teal", primary: "#0d9488", secondary: "#14b8a6" },
  { id: "indigo", label: "Indigo", primary: "#4f46e5", secondary: "#6366f1" },
  { id: "pink", label: "Pink", primary: "#ec4899", secondary: "#f472b6" },
  { id: "orange", label: "Orange", primary: "#f97316", secondary: "#fb923c" },
  { id: "cyan", label: "Cyan", primary: "#06b6d4", secondary: "#0891b2" },
];

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("blue");

  // Carga tema guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem("app-theme");
      if (saved) setTheme(saved);
    } catch (err) {
      // ignore
    }
  }, []);

  // Aplica al <html data-theme="...">
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("app-theme", theme);
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
