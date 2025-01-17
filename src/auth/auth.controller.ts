import { Controller, Post, Body, HttpException, HttpStatus, Get, Headers } from "@nestjs/common";
import { UserCreateType, UserSignup } from "./dtos/signup.dto";
import { DBUser } from "../shared_providers/dbUser.service";
import { TokenData, Tokens } from "./dtos/tokens.dto";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UserLogin } from "./dtos/login.dto";
import { GoogleDTO, GoogleExchangeRes, GoogleUserInfo } from "./dtos/callbacks.dto";
import { TokenAuth } from "./providers/tokenAuth.provider";
import { AuthType } from "./schemas/user.schema";

@Controller('/auth')
export class AuthController {
    constructor(
        private jwtService: JwtService,
        private dbUserService: DBUser,
        private configService: ConfigService,
        private tokenAuth: TokenAuth
    ) {}

    @Post('/signup')
    async signup(@Body() signupData: UserSignup): Promise<Tokens> {
        const existingUser = await this.dbUserService.findUser(signupData.email);

        if (existingUser) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'Email is already registered',
            }, HttpStatus.BAD_REQUEST);
        }

        const userData: UserCreateType = {
            ...signupData,
            pfp_url: null,
        };

        const createdUser = await this.dbUserService.createUser(userData, AuthType.EMAIL);
        const accessToken = await this.tokenAuth.createAccessToken(createdUser);

        return { access_token: accessToken };
    }

    @Post('/login')
    async login(@Body() loginData: UserLogin): Promise<Tokens> {
        const user = await this.dbUserService.findUser(loginData.email);

        if (!user) {
            throw new HttpException({
                status: HttpStatus.UNAUTHORIZED,
                error: 'Invalid credentials',
            }, HttpStatus.UNAUTHORIZED);
        }

        if (user.auth.auth_type !== AuthType.EMAIL) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: "This email has been registered via another method of authentication. Please use that method to log in.",
            }, HttpStatus.BAD_REQUEST);
        }

        const isPasswordValid = await this.dbUserService.verifyPassword(loginData.password, user.auth.password);
        if (!isPasswordValid) {
            throw new HttpException({
                status: HttpStatus.UNAUTHORIZED,
                error: 'Invalid credentials',
            }, HttpStatus.UNAUTHORIZED);
        }

        if (user.disabled) {
            throw new HttpException({
                status: HttpStatus.UNAUTHORIZED,
                error: 'User account is disabled',
            }, HttpStatus.UNAUTHORIZED);
        }

        const accessToken = await this.tokenAuth.createAccessToken(user);
        return { access_token: accessToken };
    }

    @Post('/googleCallback')
    async googleCallback(@Body() data: GoogleDTO): Promise<Tokens> {
        const client_id = await this.configService.get<string>("GOOGLE_CLIENT_ID");
        const client_secret = await this.configService.get<string>("GOOGLE_CLIENT_SECRET");
        const userInfoEndpoint = 'https://www.googleapis.com/userinfo/v2/me';
        
        try {
            const exchangeEndpoint = `https://oauth2.googleapis.com/token?code=${data.code}&redirect_uri=${data.redirect_uri}&client_id=${client_id}&client_secret=${client_secret}&grant_type=authorization_code`;
            const tokenResponse = await fetch(exchangeEndpoint, { method: "POST" });

            if (!tokenResponse.ok) {
                throw new HttpException({
                    status: HttpStatus.BAD_REQUEST,
                    error: 'An error occurred. Please restart the authentication process.',
                }, HttpStatus.BAD_REQUEST);
            }

            const tokens: GoogleExchangeRes = await tokenResponse.json();
            const userInfoResponse = await fetch(userInfoEndpoint, {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });

            if (!userInfoResponse.ok) {
                throw new HttpException({
                    status: HttpStatus.BAD_REQUEST,
                    error: userInfoResponse.statusText,
                }, HttpStatus.BAD_REQUEST);
            }

            const accountInfo: GoogleUserInfo = await userInfoResponse.json();
            const existingUser = await this.dbUserService.findUser(accountInfo.email);
            if (existingUser && existingUser.auth.auth_type !== AuthType.GOOGLE) {
                throw new HttpException({
                    status: HttpStatus.BAD_REQUEST,
                    error: "This email has been registered via another method of authentication. Please use that method to log in.",
                }, HttpStatus.BAD_REQUEST);
            }

            const user = existingUser ?? await this.dbUserService.createUser({
                email: accountInfo.email,
                name: accountInfo.name,
                password: null,
                pfp_url: accountInfo.picture,
            }, AuthType.GOOGLE);

            const accessToken = await this.tokenAuth.createAccessToken(user);
            return { access_token: accessToken };
        } catch (err) {
            throw err instanceof HttpException ? err : 
            new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: err.message || 'An unexpected error occurred',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Get('/validateToken')
    async validateToken(@Headers() headers): Promise<{ valid: boolean }> {
        const auth = headers['authorization'];
        if (!auth) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'Missing access_token',
            }, HttpStatus.BAD_REQUEST);
        }

        const token = auth.replace("Bearer ", "");
        try {
            const tokenData: TokenData = await this.jwtService.verifyAsync(JSON.parse(token), {
                secret: this.configService.get<string>("JWT_SECRET"),
            });

            const user = await this.dbUserService.findUserById(tokenData.uid);
            return { valid: user.account_info.email == tokenData.email };
        } catch (err) {
            return { valid: false };
        }
    }
}
