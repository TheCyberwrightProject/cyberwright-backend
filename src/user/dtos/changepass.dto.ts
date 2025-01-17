import { IsNotEmpty } from "class-validator";

export class ChangePasswordData {
    @IsNotEmpty()
    new_password: string;
}