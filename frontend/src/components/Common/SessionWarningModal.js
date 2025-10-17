// src/components/Common/SessionWarningModal.js
import React from 'react';
import ModalBase from '../Modals/ModalBase';
import { AlertTriangle } from 'lucide-react';
import ActionButton from './ActionButton';

const SessionWarningModal = ({
  open,
  title = 'Sesión a punto de expirar',
  message = 'Por seguridad, tu sesión expirará pronto por inactividad. ¿Deseas continuar conectado?',
  onContinue,
  onLogout,
}) => {
  return (
    <ModalBase
      isOpen={open}
      title={title}
      icon={AlertTriangle}
      onClose={onLogout}
      size="sm"
    >
      <div className="p-6" style={{ color: 'var(--text)' }}>
        <p>{message}</p>
      </div>
      <div
        className="p-4 border-t flex items-center justify-end gap-2"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
      >
        <ActionButton color="red" onClick={onLogout}>Cerrar sesión</ActionButton>
        <ActionButton color="theme" onClick={onContinue}>Continuar sesión</ActionButton>
      </div>
    </ModalBase>
  );
};

export default SessionWarningModal;
