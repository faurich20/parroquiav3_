// src/components/Common/TablaBase.js
import React from 'react';

/**
 * TablaBase: tabla reutilizable con soporte de tema y celdas personalizadas.
 * Props:
 * - columns: [{ key, header, width, align, render?: (row, index) => ReactNode }]
 * - data: array de filas
 * - rowKey: (row) => string | row.id
 * - className, style
 * - headerSticky: boolean
 * - hover: boolean
 * - striped: boolean
 * - emptyText: string
 */
const TablaBase = ({
  columns = [],
  data = [],
  rowKey,
  className = '',
  style = {},
  headerSticky = false,
  hover = true,
  striped = false,
  emptyText = 'Sin registros',
}) => {
  const getRowKey = (row, idx) => (typeof rowKey === 'function' ? rowKey(row) : row?.id ?? idx);

  return (
    <div className={`overflow-x-auto ${className}`} style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', ...style }}>
      <table className="w-full" style={{ tableLayout: 'fixed', color: 'var(--text)' }}>
        <thead style={headerSticky ? { position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 } : undefined}>
          <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2 px-4 font-semibold ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                style={{ width: col.width, color: 'var(--text)' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-6 px-4 text-center" style={{ color: 'var(--muted)' }}>
                {emptyText}
              </td>
            </tr>
          )}
          {data.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              className={`border-b ${hover ? 'transition-colors' : ''}`}
              style={{
                borderColor: 'var(--border)',
                background: striped && index % 2 === 1 ? 'rgba(255,255,255,0.02)' : undefined,
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2 px-4 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {typeof col.render === 'function' ? col.render(row, index) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaBase;
