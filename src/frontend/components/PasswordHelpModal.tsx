/**
 * PasswordHelpModal.tsx
 * Modal/Popup que exibe ajuda sobre requisitos de senha.
 * Pode ser aberta clicando no ícone de ajuda ao lado do campo de senha.
 */
import { CheckCircle, X } from 'lucide-react';
import React from 'react';
import './PasswordHelpModal.css';

interface PasswordHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordHelpModal: React.FC<PasswordHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="password-help-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="password-help-modal">
        {/* Header */}
        <div className="modal-header">
          <h2>🔐 Requisitos de Senha</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="modal-content">
          <p className="intro-text">
            Sua senha deve atender a <strong>TODOS</strong> os requisitos abaixo para ser considerada segura:
          </p>

          {/* Requisito 1 */}
          <div className="requirement-box">
            <div className="requirement-icon">1️⃣</div>
            <div className="requirement-details">
              <h3>Mínimo de 10 Caracteres</h3>
              <p>Sua senha deve ter pelo menos 10 caracteres de comprimento.</p>
              <div className="example">
                <CheckCircle size={14} className="ok" />
                <code>MinhaSenh@2024</code> (14 caracteres) ✓
              </div>
            </div>
          </div>

          {/* Requisito 2 */}
          <div className="requirement-box">
            <div className="requirement-icon">2️⃣</div>
            <div className="requirement-details">
              <h3>Pelo Menos 1 Letra MAIÚSCULA</h3>
              <p>Use pelo menos uma letra em caixa alta (A-Z).</p>
              <div className="example">
                <CheckCircle size={14} className="ok" />
                <code>MinhaSenh@2024</code> (contém: M, S) ✓
              </div>
            </div>
          </div>

          {/* Requisito 3 */}
          <div className="requirement-box">
            <div className="requirement-icon">3️⃣</div>
            <div className="requirement-details">
              <h3>Pelo Menos 1 Letra Minúscula</h3>
              <p>Use pelo menos uma letra em caixa baixa (a-z).</p>
              <div className="example">
                <CheckCircle size={14} className="ok" />
                <code>MinhaSenh@2024</code> (contém: i, n, h, a, e) ✓
              </div>
            </div>
          </div>

          {/* Requisito 4 */}
          <div className="requirement-box">
            <div className="requirement-icon">4️⃣</div>
            <div className="requirement-details">
              <h3>Pelo Menos 1 Número</h3>
              <p>Use pelo menos um dígito numérico (0-9).</p>
              <div className="example">
                <CheckCircle size={14} className="ok" />
                <code>MinhaSenh@2024</code> (contém: 2024) ✓
              </div>
            </div>
          </div>

          {/* Requisito 5 */}
          <div className="requirement-box">
            <div className="requirement-icon">5️⃣</div>
            <div className="requirement-details">
              <h3>Pelo Menos 1 Caractere Especial</h3>
              <p>Use pelo menos um caractere especial: ! @ # $ % ^ & * - _ = + [ ] { } ; : , . &lt; &gt; ?</p>
              <div className="example">
                <CheckCircle size={14} className="ok" />
                <code>MinhaSenh@2024</code> (contém: @) ✓
              </div>
            </div>
          </div>

          {/* Dicas */}
          <div className="tips-section">
            <h3>💡 Dicas Extras</h3>
            <ul className="tips-list">
              <li>✓ Quanto mais longa, mais segura (15+ caracteres é ótimo)</li>
              <li>✓ Não use seu nome, email ou data de nascimento</li>
              <li>✓ Use uma frase e pegue as primeiras letras</li>
              <li>✓ Altere sua senha regularmente (a cada 3 meses)</li>
              <li>✓ Use um gerenciador de senhas para guardar com segurança</li>
            </ul>
          </div>

          {/* Exemplos */}
          <div className="examples-section">
            <h3>✅ Senhas Válidas</h3>
            <div className="valid-examples">
              <code>Trabalho#123456</code>
              <code>SalesMind!2025ABC</code>
              <code>Empresa@Forte#99</code>
            </div>

            <h3 style={{ marginTop: '16px' }}>❌ Senhas Inválidas</h3>
            <div className="invalid-examples">
              <code>senha123</code> (faltam maiúscula e caractere especial)
              <code>MAIUSCULA123!</code> (faltam letras minúsculas)
              <code>Senha@123</code> (muito curta, 9 caracteres)
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            ✓ Entendi
          </button>
        </div>
      </div>
    </>
  );
};

export default PasswordHelpModal;
