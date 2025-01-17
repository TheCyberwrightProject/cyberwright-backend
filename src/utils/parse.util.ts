import { TokenData } from "src/auth/dtos/tokens.dto";
import { User } from "src/auth/schemas/user.schema";
import { DBUser } from "src/shared_providers/dbUser.service";

export async function getUserFromHeaders(headers, dbService: DBUser): Promise<User> {
    const token_data: TokenData = headers["token_data"];
    return await dbService.findUserById(token_data.uid)
}