import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "../schemas/user.schema";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TokenAuth {
    constructor(private jwtService: JwtService, private configService: ConfigService) {}

    async createAccessToken(user: User): Promise<string> {
        const payload = {
            uid: user.uid,
            email: user.account_info.email
        }
        return await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>("JWT_SECRET"),
            expiresIn: "24h"
        })
    }
}