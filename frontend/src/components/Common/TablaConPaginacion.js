// src/components/Common/TablaConPaginacion.js
import React, { useMemo, useState, useEffect } from 'react';
import TablaBase from './TablaBase';

/**
 * TablaConPaginacion: tabla con paginación integrada y controles completos.
 * Props:
 * - columns: [{ key, header, width, align, render?: (row, index) => ReactNode }]
 * - data: array de filas (datos sin filtrar)
 * - rowKey: (row) => string | row.id
 * - searchTerm: string para filtrar datos
 * - searchKeys: array de keys para buscar (ej: ['name', 'email'])
 * - itemsPerPage: número de items por página (default: 7)
 * - className, style, headerSticky, hover, striped, emptyText: props para TablaBase
 * - showPagination: boolean para mostrar/ocultar controles (default: true)
 */
const TablaConPaginacion = ({
  columns = [],
  data = [],
  rowKey,
  searchTerm = '',
  searchKeys = [],
  itemsPerPage = 7,
  className = '',
  style = {},
  headerSticky = false,
  hover = true,
  striped = false,
  emptyText = 'Sin registros',
  showPagination = true,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrar datos basado en searchTerm y searchKeys
  const filteredData = useMemo(() => {
    if (!searchTerm.trim() || !searchKeys.length) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const value = row[key];
        return value && String(value).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, searchKeys]);

  // Lógica de paginación
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Debug logging
  console.log('TablaConPaginacion Debug:', {
    dataLength: data.length,
    filteredLength: filteredData.length,
    totalPages,
    currentPage,
    itemsPerPage,
    showPagination,
    hasPagination: totalPages > 1
  });

  // Reset currentPage si excede totalPages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Siempre mostrar controles de paginación si hay datos
  const paginationControls = showPagination && filteredData.length > 0 && (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>Página</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => {
            const n = parseInt(e.target.value || '1', 10);
            if (Number.isNaN(n)) return;
            const clamped = Math.max(1, Math.min(n, totalPages));
            setCurrentPage(clamped);
          }}
          className="w-14 px-2 py-1 rounded-lg text-center text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
        <span className="text-sm" style={{ color: 'var(--muted)' }}>de {totalPages}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
          style={{ borderColor: 'var(--border)' }}
        >
          Anterior
        </button>

        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
          const pageNum = i + 1;
          return (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`px-3 py-1 rounded-lg border text-sm transition-colors`}
              style={
                currentPage === pageNum
                  ? { background: 'var(--primary)', color: '#ffffff', borderColor: 'var(--primary)' }
                  : { borderColor: 'var(--border)' }
              }
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
          style={{ borderColor: 'var(--border)' }}
        >
          Siguiente
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <TablaBase
        columns={columns}
        data={paginatedData}
        rowKey={rowKey}
        className={className}
        style={style}
        headerSticky={headerSticky}
        hover={hover}
        striped={striped}
        emptyText={emptyText}
      />
      {paginationControls}
    </div>
  );
};

export default TablaConPaginacion;
