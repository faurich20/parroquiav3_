// src/components/UI/Card.js
import React from "react";

const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`rounded-2xl shadow-sm border p-6 transition-colors ${className}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)"
      }}
    >
      {/* 
        Nota: en lugar de fijar color global en el div,
        dejamos que cada nivel de texto use las variables adecuadas
      */}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

// Helpers para textos consistentes dentro del Card
export const CardTitle = ({ children, className = "" }) => (
  <h2
    className={`text-xl font-bold ${className}`}
    style={{ color: "var(--text-strong)" }}
  >
    {children}
  </h2>
);

export const CardSubtitle = ({ children, className = "" }) => (
  <p
    className={`text-sm font-medium ${className}`}
    style={{ color: "var(--muted)" }}
  >
    {children}
  </p>
);

export const CardText = ({ children, className = "" }) => (
  <p
    className={`text-base ${className}`}
    style={{ color: "var(--text)" }}
  >
    {children}
  </p>
);

export default Card;
