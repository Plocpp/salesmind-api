import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware (req: Request, res: Response, next: NextFunction ) {
    const authHeader = req.headers.authorization;

    if ( !authHeader){
        return res.status(401).json({ error: "Token mnão fornecido"});
    }

    const [, token] =  authHeader.split(" ");

    try {
        const decoded  =  jwt .verify(token, "segredo");

        (res as any ).user = decoded;

        return next ();
    } catch (error) {

        return res. status (401).json ({ error:  " Token invalido "})
    }
}