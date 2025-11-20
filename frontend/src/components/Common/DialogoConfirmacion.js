// src/components/Common/DialogoConfirmacion.js
import React from 'react';
import ModalBase from '../Modals/ModalBase.js';
import { AlertTriangle } from 'lucide-react';

const DialogoConfirmacion = ({
  abierto,
  open,
  titulo = 'Confirmar',
  title,
  mensaje = '¿Estás seguro?',
  message,
  onConfirmar,
  onConfirm,
  onCancelar,
  onCancel,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  isDanger = false
}) => {
  const isOpen = typeof open !== 'undefined' ? open : abierto;
  const finalTitle = title || titulo;
  const finalMessage = message || mensaje;
  const handleConfirm = onConfirm || onConfirmar;
  const handleCancel = onCancel || onCancelar;

  return (
    <ModalBase isOpen={isOpen} title={finalTitle} icon={AlertTriangle} onClose={handleCancel} size="sm">
      <div className="p-6">
        <p className="text-gray-700">{finalMessage}</p>
      </div>
      <div className="p-4 border-t bg-white flex items-center justify-end gap-2">
        <button 
          onClick={handleCancel} 
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          {cancelText}
        </button>
        <button 
          onClick={handleConfirm} 
          className="px-4 py-2 text-white rounded-lg transition-all hover:brightness-110 shadow-md"
          style={{ 
            background: isDanger 
              ? '#dc2626' 
              : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' 
          }}
        >
          {confirmText}
        </button>
      </div>
    </ModalBase>
  );
};

export default DialogoConfirmacion;
