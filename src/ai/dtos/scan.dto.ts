import { IsNotEmpty } from "class-validator";

export class AiScan {
    @IsNotEmpty()
    input: string;
}

export class AiResp {
    choices: [{
        message: {
            content: string
        }
    }]
}