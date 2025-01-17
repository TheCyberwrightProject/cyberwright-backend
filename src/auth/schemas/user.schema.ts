import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export enum AccountType {
    USER = "user",
    ADMIN = "admin",
    BETA = "beta"
}

export enum AuthType {
    EMAIL = "email",
    GOOGLE = "google"
}

export class Metrics {
    numDirectoriesUploaded: number;
    numAPICalls: number;
}

@Schema()
export class User {
    @Prop({ required: true })
    uid: string;

    @Prop({ required: true, type: Object })
    account_info: {
        name: string,
        email: string,
        pfp_url: string,
    }

    @Prop({ required: true, type: Object })
    auth: {
        password: string | null,
        account_type: AccountType,
        auth_type: AuthType
    }

    @Prop({ required: true, type: Object })
    metrics: Metrics

    @Prop({ required: true })
    disabled: boolean;
}

export type UserDocument = HydratedDocument<User>
export const UserSchema = SchemaFactory.createForClass(User);