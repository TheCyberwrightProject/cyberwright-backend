import { Injectable } from "@nestjs/common";
import { User, AccountType, AuthType, Metrics } from "../auth/schemas/user.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { UserCreateType, UserSignup } from "../auth/dtos/signup.dto";
import { hash, compare } from "bcrypt"
import { v4 } from "uuid";

@Injectable()
export class DBUser {
    constructor(@InjectModel(User.name) private user: Model<User>) {}

    async createUser(userData: UserCreateType, auth_type: AuthType): Promise<User> {
        const newUser = new this.user({
            uid: v4(),
            disabled: false,
            account_info: {
                name: userData.name,
                email: userData.email,
                pfp_url: auth_type == AuthType.EMAIL ? "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg" : userData.pfp_url
            },
            auth: {
                account_type: AccountType.USER,
                password: auth_type == AuthType.EMAIL ? await hash(userData.password, 10) : null,
                auth_type: auth_type
            },
            metrics: {
                numAPICalls: 0,
                numDirectoriesUploaded: 0
            }
        })
        return (await newUser.save()).toJSON();
    }

    async findUser(email: string): Promise<User> {
        const user = await this.user.findOne({ 'account_info.email': email })
        return user != null ? user.toJSON() : user;
    }

    async findUserById(uid: string): Promise<User> {
        const user = await this.user.findOne({ 'uid': uid })
        return user != null ? user.toJSON() : user;
    }

    async verifyPassword(password: string, hashed_password: string): Promise<boolean> {
        return await compare(password, hashed_password);
    }

    async modifyPassword(newPassword: string, userObj: User): Promise<void> {
        userObj.auth.password = await hash(newPassword, 10);
        await this.user.updateOne({ uid: userObj.uid }, {
            $set: userObj
        })
    }

    async updateUser(user: User): Promise<void> {
        await this.user.updateOne({ uid: user.uid }, {
            $set: user
        })
    }

    async incrementAPICalls(user: User): Promise<void> {
        user.metrics.numAPICalls += 1
        await this.user.updateOne({ uid: user.uid }, {
            $set: user
        })
    }
}