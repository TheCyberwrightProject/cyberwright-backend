import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./schemas/user.schema";
import { DBUser } from "../shared_providers/dbUser.service";
import { JwtService } from "@nestjs/jwt";
import { AuthCheckMiddleware } from "./middleware/authCheck.middleware";
import { TokenAuth } from "./providers/tokenAuth.provider";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    controllers: [AuthController],
    providers: [DBUser, JwtService, TokenAuth],
})


export class AuthModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthCheckMiddleware)
            .exclude('/auth/validateToken')
            .forRoutes('/auth')
    }
}