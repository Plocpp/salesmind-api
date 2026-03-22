import { Request, Response } from "express";
import authService from "../services/auth.service";
class AuthController {

async register(req: Request, res: Response) {

    try {

        console.log("REGISTER BODY:", req.body);

        const usuario = await authService.register(req.body);

        return res.status(201).json(usuario);

    } catch (error: any) {

        return res.status(400).json({ error: error.message });

    }

}

async login(req: Request, res: Response) {

    try {

        const token = await authService.login(req.body);

        return res.json(token);

    } catch (error: any) {

        return res.status(400).json({ error: error.message });

    }

}

}

export default new AuthController();