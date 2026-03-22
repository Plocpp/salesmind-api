import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../database/prisma";

class AuthService {

    async register(data: any) {

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

    async login(data: any) {

        const usuario = await prisma.usuario.findUnique({
        where: { email: data.email }
        });

    if (!usuario) {
        throw new Error("Usuário não encontrado");
        }

        const senhaValida = await bcrypt.compare(data.senha, usuario.senha);

        if (!senhaValida) {
        throw new Error("Senha inválida");
        }

        const token = jwt.sign(
        { id: usuario.id },
        "segredo",
        { expiresIn: "1d" }
        );

        return { token };
    }

}

export default new AuthService();
