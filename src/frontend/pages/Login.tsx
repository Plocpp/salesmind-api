/**
 * Login.tsx
 * Página de autenticação do usuário.
 *
 * Funções principais:
 * 1) Autenticar credenciais via API.
 * 2) Persistir token e role no localStorage e disparar callback de rota.
 * 3) Exibir funil comercial de onboarding para compra da plataforma.
 */
import { LogIn } from "lucide-react";
import React, { useState } from "react";
import { api } from "../services/api";
import "./Login.css";
import OnboardingFunnel from "./OnboardingFunnel";

interface LoginProps {
    onLogin: (role?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarFunil, setMostrarFunil] = useState(false);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState("");

    function formatarErroLogin(error: unknown) {
        const fallback = "E-mail ou senha inválidos.";
        const message = error instanceof Error ? error.message : "";

        const match = message.match(/HTTP\s+(\d+):\s*(.*)/i);
        if (!match) return fallback;

        const status = Number(match[1]);
        const bodyRaw = match[2] || "";

        let payload: any = null;
        try {
            payload = JSON.parse(bodyRaw);
        } catch {
            payload = null;
        }

        if (status === 429) {
            const retry = Number(payload?.retryAfterSeconds || 0);
            if (retry > 0) {
                const minutos = Math.ceil(retry / 60);
                return `Muitas tentativas. Tente novamente em ${minutos} min.`;
            }
            return "Muitas tentativas de login. Aguarde alguns minutos.";
        }

        if (status === 400 || status === 401 || status === 404) {
            return payload?.error || fallback;
        }

        return fallback;
    }

    async function handleLogin() {
        setErro("");
        setLoading(true);
        try {
            const response = await api.post("/auth/login", { email, senha });
            localStorage.setItem("token", response.accessToken);
            localStorage.setItem("userRole", response.role || "USER");
            onLogin(response.role);
        } catch (error) {
            setErro(formatarErroLogin(error));
        } finally {
            setLoading(false);
        }
    }

    if (mostrarFunil) {
        return <OnboardingFunnel onVoltarLogin={() => setMostrarFunil(false)} />;
    }

    return (
        <div className="login-root">
            <div className="login-bg-glow" aria-hidden="true" />

            <div className="login-card">
                <div className="login-logo-pill">SALESMIND</div>
                <h1 className="login-title">Acesso à plataforma</h1>
                <p className="login-subtitle">Gestão comercial multiempresa com IA</p>

                <div className="login-form">
                    <div className="login-field">
                        <label>E-mail</label>
                        <input
                            type="email"
                            placeholder="seu@email.com.br"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            autoComplete="email"
                        />
                    </div>

                    <div className="login-field">
                        <label>Senha</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            autoComplete="current-password"
                        />
                    </div>

                    {erro && <p className="login-erro">{erro}</p>}

                    <button
                        className="login-btn-primary"
                        onClick={handleLogin}
                        disabled={loading || !email || !senha}
                    >
                        <LogIn size={16} />
                        {loading ? "Entrando..." : "Entrar"}
                    </button>
                </div>

                <div className="login-divider"><span>ou</span></div>

                <button
                    className="login-btn-funnel"
                    onClick={() => setMostrarFunil(true)}
                >
                    🚀 Conhecer planos e contratar
                </button>

                <p className="login-footer-note">
                    Plataforma protegida por LGPD · Acesso monitorado por auditoria
                </p>
            </div>
        </div>
    );
};

export default Login;
