import { IsEmail, IsNotEmpty } from "class-validator";

export class UserSignup {
    @IsNotEmpty()
    name: string;
    
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    password: string;
}

export class UserCreateType {
    name: string;
    email: string;
    password: string | null;
    pfp_url: string | null
}