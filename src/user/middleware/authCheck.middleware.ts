import { HttpException, HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class AuthCheckMiddleware implements NestMiddleware {
    constructor(private jwtService: JwtService, private configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            throw new HttpException(
                {
                    status: HttpStatus.UNAUTHORIZED,
                    error: 'User needs to login',
                },
                HttpStatus.UNAUTHORIZED
            );
        }

        const token = authHeader.replace("Bearer ", "");

        let parsedToken: string;
        try {
            parsedToken = JSON.parse(token);
        } catch {
            parsedToken = token;
        }

        try {
            const tokenData = this.jwtService.verify(parsedToken, {
                secret: this.configService.get<string>("JWT_SECRET"),
            });
            req.headers["token_data"] = tokenData
            return next();
        } catch (err) {
            throw new HttpException(
                {
                    status: HttpStatus.UNAUTHORIZED,
                    error: 'Invalid access token',
                },
                HttpStatus.UNAUTHORIZED
            );
        }
    }
}
