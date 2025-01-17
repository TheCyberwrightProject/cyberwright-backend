import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "src/auth/schemas/user.schema";
import { DBUser } from "src/shared_providers/dbUser.service";
import { UserController } from "./user.controller";
import { AuthCheckMiddleware } from "./middleware/authCheck.middleware";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
    ],
    controllers: [UserController],
    providers: [JwtService, DBUser]
})

export class UserModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(AuthCheckMiddleware).forRoutes('/user')
    }
}