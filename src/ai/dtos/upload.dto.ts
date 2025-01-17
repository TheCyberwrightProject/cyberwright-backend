import { IsNotEmpty, IsNumber } from "class-validator";
import { Diagnostic } from "../schemas/upload.schema";

export class InitSession {
    @IsNotEmpty()
    dir_name: string;

    @IsNotEmpty()
    @IsNumber()
    num_files: number;
}

export class FileUpload {
    @IsNotEmpty()
    uid: string;
}

export class UploadRes {
    @IsNotEmpty()
    uid: string;
}

export class File {
    name: string;
    path: string;
    contents: string;
}

export class GetDiagnosticsRet {
    status: string;
    diagnostics: Diagnostic[] | null;
}

export class Context {
    langs: string;
    vulnerability: string;
    vulnerable_line: string;
    description: string;
    document: string;
}

export class ContextFiles {
    context: Context | null
    file: File;
}
