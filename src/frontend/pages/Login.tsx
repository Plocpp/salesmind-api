/**
 * Login.tsx
 * Página de autenticação do usuário.
 * 
 * Funções principais:
 * 1) Autenticar credenciais via API.
 * 2) Persistir token e role no localStorage e disparar callback de rota.
 */
import React, { useState } from "react";
import { api } from "../services/api";

interface LoginProps {
    onLogin: (role?: string) => void;
}

// === Autenticação / Persistência de sessão ===
const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    async function handleLogin() {
        try {
        const response = await api.post("/auth/login", {
            email,
            senha
        });

        localStorage.setItem("token", response.accessToken);
        localStorage.setItem("userRole", response.role || "USER");

        alert("Login realizado!");
        onLogin(response.role);

        } catch {
        alert("Erro no login");
        }
    }

    return (
        <div>
        <h1>Login</h1>

        <input
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
        />

        <input
            placeholder="Senha"
            type="password"
            onChange={(e) => setSenha(e.target.value)}
        />

        <button onClick={handleLogin}>Entrar</button>
        </div>
    );
};

export default Login;