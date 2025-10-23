// src/components/Common/DialogoConfirmacion.js
import React from 'react';
import ModalBase from '../Modals/ModalBase.js';
import { AlertTriangle } from 'lucide-react';

const DialogoConfirmacion = ({ abierto, titulo = 'Confirmar', mensaje = '¿Estás seguro?', onConfirmar, onCancelar, confirmText = 'Aceptar', cancelText = 'Cancelar', isDanger = false }) => {
  return (
    <ModalBase isOpen={abierto} title={titulo} icon={AlertTriangle} onClose={onCancelar} size="sm">
      <div className="p-6">
        <p className="text-gray-700">{mensaje}</p>
      </div>
      <div className="p-4 border-t bg-white flex items-center justify-end gap-2">
        <button 
          onClick={onCancelar} 
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          {cancelText}
        </button>
        <button 
          onClick={onConfirmar} 
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
