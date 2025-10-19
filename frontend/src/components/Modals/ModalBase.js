// src/components/Modals/ModalBase.js
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const ModalBase = ({
  isOpen,
  title,
  icon: Icon,
  onClose,
  children,
  footer,
  size = 'md', // 'sm'|'md'|'lg'|'xl'
  closeOnOverlay = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'black';

  useEffect(() => {
    if (isOpen) document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            className={`${isDark ? 'bg-gray-900 text-gray-100' : 'bg-white'} rounded-2xl w-full ${sizes[size]} shadow-2xl overflow-hidden flex flex-col m-4`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh' }}
          >
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white'} flex-shrink-0`}>
              <div className="flex items-center gap-3">
                {Icon ? <Icon className="w-6 h-6 text-blue-600" /> : null}
                <h2 className="text-xl font-semibold">{title}</h2>
              </div>
              <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`} aria-label="Cerrar modal">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">{children}</div>

            {footer ? (
              <div className={`p-4 border-t ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white'} flex-shrink-0`}>{footer}</div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default ModalBase;
