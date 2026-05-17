import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../database/prisma";
import { validatePasswordStrength } from "../utils/password-policy";

class AuthService {
    /**
     * Registra um novo usuário e armazena senha criptografada.
     */
    async register(data: any) {
        const passwordValidation = validatePasswordStrength(data?.senha);
        if (!passwordValidation.ok) {
            throw new Error(passwordValidation.message || "senha_invalida");
        }

        const senhaHash = await bcrypt.hash(data.senha, 10);

        const usuario = await prisma.usuario.create({
            data: {
                nome: data.nome,
                email: data.email,
                senha: senhaHash
            }
        });

        return usuario;
    }

    /**
     * Faz login de usuário e retorna um token JWT válido.
     */
    async login(data: any) {
        const email = String(data?.email || "").trim().toLowerCase();
        const senha = String(data?.senha || "");

        if (!email || !senha) {
            throw new Error("email_e_senha_obrigatorios");
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email }
        });

        if (!usuario) {
            throw new Error("Usuário não encontrado");
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            throw new Error("Senha inválida");
        }

        if (!process.env.JWT_ACCESS_SECRET) {
            throw new Error("JWT_ACCESS_SECRET_nao_configurado");
        }

        const token = jwt.sign(
            { userId: usuario.id, role: usuario.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "15m" }
        );

        return { token };
    }

    /**
     * Retorna o usuário registrado que possui o email informado.
     */
    async buscarPorEmail(email: string) {
        return await prisma.usuario.findUnique({
            where: { email }
        });
    }
}

export default new AuthService();
