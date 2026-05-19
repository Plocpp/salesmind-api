/**
 * Perfil.tsx
 * Página de perfil e configurações do usuário.
 * Permite alterar dados pessoais e senha com validação de requisitos.
 */
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import PasswordRequirements from '../components/PasswordRequirements';
import { api } from '../services/api';
import './Perfil.css';

const Perfil: React.FC = () => {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Estados para alteração de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [loadingAlteracao, setLoadingAlteracao] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const response = await api.get('/auth/me');
        setUsuario(response);
        setLoading(false);
      } catch (error: any) {
        setErro(error.message || 'Erro ao carregar perfil');
        setLoading(false);
      }
    }
    carregarPerfil();
  }, []);

  async function handleAlterarSenha() {
    setErro('');
    setSucesso('');

    // Validações
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErro('Todos os campos são obrigatórios');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    if (senhaAtual === novaSenha) {
      setErro('A nova senha deve ser diferente da atual');
      return;
    }

    setLoadingAlteracao(true);

    try {
      await api.post('/auth/change-password', {
        senhaAtual,
        novaSenha,
      });

      setSucesso('✅ Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');

      setTimeout(() => setSucesso(''), 3000);
    } catch (error: any) {
      const mensagem = error.response?.data?.error || error.message || 'Erro ao alterar senha';
      setErro(mensagem);
    } finally {
      setLoadingAlteracao(false);
    }
  }

  if (loading) {
    return (
      <div className="perfil-container">
        <div className="perfil-loading">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h1>👤 Meu Perfil</h1>
        <p className="perfil-subtitle">Gerencie suas informações pessoais e segurança</p>
      </div>

      {/* Seção de Informações Pessoais */}
      <div className="perfil-section">
        <h2>📋 Informações Pessoais</h2>
        <div className="perfil-info">
          <div className="info-item">
            <label>Nome</label>
            <p>{usuario?.nome || 'Não informado'}</p>
          </div>
          <div className="info-item">
            <label>E-mail</label>
            <p>{usuario?.email || 'Não informado'}</p>
          </div>
          <div className="info-item">
            <label>Nível de Acesso</label>
            <span className={`role-badge role-${usuario?.role?.toLowerCase()}`}>
              {usuario?.role === 'ADMIN' ? '🔐 Administrador' : '👤 Usuário'}
            </span>
          </div>
        </div>
      </div>

      {/* Seção de Alterar Senha */}
      <div className="perfil-section password-section">
        <h2>🔐 Alterar Senha</h2>

        {erro && (
          <div className="perfil-alert alert-erro">
            <AlertCircle size={18} />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="perfil-alert alert-sucesso">
            <CheckCircle size={18} />
            <span>{sucesso}</span>
          </div>
        )}

        <div className="password-form">
          {/* Senha Atual */}
          <div className="form-group">
            <label>Senha Atual</label>
            <div className="password-input-wrapper">
              <input
                type={mostrarSenhaAtual ? 'text' : 'password'}
                placeholder="Digite sua senha atual"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
              >
                {mostrarSenhaAtual ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="form-group">
            <label>Nova Senha</label>
            <div className="password-input-wrapper">
              <input
                type={mostrarNovaSenha ? 'text' : 'password'}
                placeholder="Digite a nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
              >
                {mostrarNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Componente de Requisitos */}
            {novaSenha.length > 0 && (
              <PasswordRequirements password={novaSenha} minLength={10} showDetails={true} />
            )}
          </div>

          {/* Confirmar Nova Senha */}
          <div className="form-group">
            <label>Confirmar Nova Senha</label>
            <div className="password-input-wrapper">
              <input
                type={mostrarConfirmarSenha ? 'text' : 'password'}
                placeholder="Confirme a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
              >
                {mostrarConfirmarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Validação de coincidência */}
            {confirmarSenha.length > 0 && (
              <div className={`password-match ${novaSenha === confirmarSenha ? 'match' : 'mismatch'}`}>
                {novaSenha === confirmarSenha ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Senhas coincidem ✓</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} />
                    <span>Senhas não coincidem</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Botão Salvar */}
          <div className="form-actions">
            <button
              className="btn-salvar"
              onClick={handleAlterarSenha}
              disabled={
                loadingAlteracao ||
                !senhaAtual ||
                !novaSenha ||
                !confirmarSenha ||
                novaSenha !== confirmarSenha
              }
            >
              <Lock size={16} />
              {loadingAlteracao ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>
      </div>

      {/* Dicas de Segurança */}
      <div className="perfil-section security-tips">
        <h2>💡 Dicas de Segurança</h2>
        <ul className="tips-list">
          <li>✓ Use senhas únicas para cada conta que você acessa</li>
          <li>✓ Combine LETRAS, números e caracteres especiais</li>
          <li>✓ Evite informações pessoais (nome, data de nascimento, etc)</li>
          <li>✓ Altere sua senha regularmente (a cada 3 meses)</li>
          <li>✓ Nunca compartilhe sua senha com outras pessoas</li>
          <li>✓ Use um gerenciador de senhas para armazenar com segurança</li>
        </ul>
      </div>
    </div>
  );
};

export default Perfil;
