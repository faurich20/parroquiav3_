// src/contexts/LiturgicalContext.js
import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const LiturgicalContext = createContext(null);

export const useLiturgical = () => useContext(LiturgicalContext);

export const LiturgicalProvider = ({ children }) => {
  const { hasPermission } = useAuth();

  const value = useMemo(() => ({
    canView: hasPermission('liturgico'),
    canEdit: hasPermission('liturgico'),
    canDelete: hasPermission('liturgico'),
  }), [hasPermission]);

  return (
    <LiturgicalContext.Provider value={value}>
      {children}
    </LiturgicalContext.Provider>
  );
};
