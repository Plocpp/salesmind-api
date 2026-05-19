/**
 * PasswordRequirements.tsx
 * Componente que exibe os requisitos de força de senha de forma visual.
 * Mostra checklist interativo com feedback em tempo real.
 */
import { Check, X } from 'lucide-react';
import React, { useMemo } from 'react';
import './PasswordRequirements.css';

interface PasswordRequirementsProps {
  password: string;
  minLength?: number;
  showDetails?: boolean; // Se true, mostra detalhes expandidos
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  minLength = 10,
  showDetails = true,
}) => {
  const requirements = useMemo(() => {
    return {
      minLength: {
        label: `Mínimo de ${minLength} caracteres`,
        met: password.length >= minLength,
        icon: password.length >= minLength ? '✓' : '○',
      },
      uppercase: {
        label: 'Pelo menos 1 letra MAIÚSCULA (A-Z)',
        met: /[A-Z]/.test(password),
        icon: /[A-Z]/.test(password) ? '✓' : '○',
      },
      lowercase: {
        label: 'Pelo menos 1 letra minúscula (a-z)',
        met: /[a-z]/.test(password),
        icon: /[a-z]/.test(password) ? '✓' : '○',
      },
      number: {
        label: 'Pelo menos 1 número (0-9)',
        met: /\d/.test(password),
        icon: /\d/.test(password) ? '✓' : '○',
      },
      special: {
        label: 'Pelo menos 1 caractere especial (!@#$%^&*)',
        met: /[^A-Za-z0-9]/.test(password),
        icon: /[^A-Za-z0-9]/.test(password) ? '✓' : '○',
      },
    };
  }, [password, minLength]);

  const allMet = Object.values(requirements).every((req) => req.met);
  const metCount = Object.values(requirements).filter((req) => req.met).length;
  const totalCount = Object.keys(requirements).length;

  if (!showDetails && password.length === 0) {
    return null; // Não mostra nada se o campo está vazio
  }

  return (
    <div className={`password-requirements ${allMet ? 'all-met' : ''}`}>
      <div className="password-requirements-header">
        <div className="password-requirements-title">
          📋 Requisitos de Senha
        </div>
        <div className={`password-requirements-progress ${allMet ? 'complete' : ''}`}>
          {metCount}/{totalCount} atendidos
        </div>
      </div>

      <div className="password-requirements-list">
        {Object.entries(requirements).map(([key, req]) => (
          <div key={key} className={`requirement-item ${req.met ? 'met' : 'unmet'}`}>
            <div className={`requirement-icon ${req.met ? 'check' : 'circle'}`}>
              {req.met ? <Check size={16} /> : <X size={16} />}
            </div>
            <span className="requirement-label">{req.label}</span>
          </div>
        ))}
      </div>

      {allMet && (
        <div className="password-requirements-success">
          ✅ Senha forte! Todos os requisitos foram atendidos.
        </div>
      )}
    </div>
  );
};

export default PasswordRequirements;
