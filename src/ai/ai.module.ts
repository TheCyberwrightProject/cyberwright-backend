import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DBUser } from "../shared_providers/dbUser.service";
import { AiController } from "./ai.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Upload, UploadSchema } from "./schemas/upload.schema";
import { UploadService } from "./providers/uploadService.service";
import { User, UserSchema } from "src/auth/schemas/user.schema";
import { JwtService } from "@nestjs/jwt";
import { AuthCheckMiddleware } from "src/user/middleware/authCheck.middleware";
import { JobRunner } from "./providers/jobRunner.service";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Upload.name, schema: UploadSchema }]),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
    ],
    controllers: [AiController],
    providers: [UploadService, DBUser, JwtService, JobRunner],
})

export class AiModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthCheckMiddleware)
            .forRoutes('/ai')
    }
}