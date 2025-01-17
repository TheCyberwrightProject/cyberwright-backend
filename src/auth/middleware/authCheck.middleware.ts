import { HttpException, HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class AuthCheckMiddleware implements NestMiddleware {
    constructor(private jwtService: JwtService, private configService: ConfigService) {}
    
    use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers["authorization"]
        if(!authHeader) {
            return next();
        }
        const token = authHeader.replace("Bearer ", "");
        try {
            const _ = this.jwtService.verify(token, { secret: this.configService.get<string>("JWT_SECRET") })
            throw new HttpException({
                status: HttpStatus.CONFLICT,
                error: 'User already logged in'
            }, HttpStatus.CONFLICT)
        } catch (err) {
            throw (err instanceof HttpException 
                ? err 
                : new HttpException(
                    {
                        status: HttpStatus.UNAUTHORIZED,
                        error: 'Invalid access token',
                    },
                    HttpStatus.UNAUTHORIZED,
                  ));
        }
    }
}