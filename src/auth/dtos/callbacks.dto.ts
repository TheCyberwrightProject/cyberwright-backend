import { IsNotEmpty, IsUrl } from "class-validator";

export class GoogleDTO {
    @IsNotEmpty()
    code: string;

    @IsNotEmpty()
    redirect_uri: string
}

export class GoogleExchangeRes {
    @IsNotEmpty()
    access_token: string;

    @IsNotEmpty()
    expires_in: number;

    @IsNotEmpty()
    token_type: string;

    @IsNotEmpty()
    scope: string;

    @IsNotEmpty()
    refresh_token: string;
}

export class GoogleUserInfo {
    id: string
    email: string
    verified_email: boolean
    name: string
    given_name: string
    family_name: string
    picture: string
}