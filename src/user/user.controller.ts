import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { DBUser } from "src/shared_providers/dbUser.service";
import { ChangePasswordData } from "./dtos/changepass.dto";
import { getUserFromHeaders } from "src/utils/parse.util";

@Controller('/user')
export class UserController {
    constructor(private dbUserService: DBUser) {}

    @Get('/accountInfo')
    async getAccountInfo(@Headers() headers) {
        const user = await getUserFromHeaders(headers, this.dbUserService);
        return { 
            info: user.account_info,
            account_type: user.auth.account_type
        };
    }

    @Post('/changePassword')
    async changePassword(@Headers() headers, @Body() newPasswordData: ChangePasswordData) {
        const user = await getUserFromHeaders(headers, this.dbUserService);
        await this.dbUserService.modifyPassword(newPasswordData.new_password, user);
        return {
            changed: true 
        }
    }

    @Get('/disabled')
    async getDisabled(@Headers() headers) {
        const user = await getUserFromHeaders(headers, this.dbUserService);
        return {
            disabled: user.disabled
        };
    }
}