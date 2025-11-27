// src/hooks/useResponsiveTableRows.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para calcular dinámicamente el número de filas que caben en la pantalla
 * sin generar scroll vertical.
 * 
 * @param {number} defaultRows - Número de filas por defecto (fallback)
 * @returns {number} - Número de filas que caben en la pantalla
 */
const useResponsiveTableRows = (defaultRows = 5) => {
  const [itemsPerPage, setItemsPerPage] = useState(defaultRows);

  const calculateRows = useCallback(() => {
    try {
      // Altura total de la ventana
      const windowHeight = window.innerHeight;

      // Altura aproximada de cada fila de tabla (incluyendo padding y border)
      const rowHeight = 60;

      // Espacio reservado estimado:
      // - Top navbar: ~60px
      // - Breadcrumbs: ~40px  
      // - Page header (título + botón): ~80px
      // - Card padding: ~32px
      // - Search bar: ~60px
      // - Table header: ~50px
      // - Paginación: ~60px
      // - Margen inferior: ~40px
      // Total aproximado: 422px, aumentado a 550px para mostrar menos filas
      const reservedSpace = 550;

      // Calcular espacio disponible para filas
      const availableHeight = Math.max(0, windowHeight - reservedSpace);

      // Calcular número de filas que caben
      let calculatedRows = Math.floor(availableHeight / rowHeight);

      // Asegurar un mínimo de 3 filas y un máximo de 12
      calculatedRows = Math.max(3, Math.min(calculatedRows, 12));

      setItemsPerPage(calculatedRows);

      // Log para debugging
      console.log('[useResponsiveTableRows] Cálculo:', {
        windowHeight,
        reservedSpace,
        availableHeight,
        rowHeight,
        calculatedRows,
        finalValue: calculatedRows
      });
    } catch (error) {
      console.error('[useResponsiveTableRows] Error:', error);
      setItemsPerPage(defaultRows);
    }
  }, [defaultRows]);

  useEffect(() => {
    // Calcular inmediatamente
    calculateRows();

    // Recalcular cuando cambie el tamaño de la ventana
    window.addEventListener('resize', calculateRows);

    // Cleanup
    return () => {
      window.removeEventListener('resize', calculateRows);
    };
  }, [calculateRows]);

  return itemsPerPage;
};

export default useResponsiveTableRows;
