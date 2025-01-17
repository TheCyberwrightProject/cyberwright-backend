import { Body, Controller, Headers, HttpException, HttpStatus, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { DBUser } from "src/shared_providers/dbUser.service";
import { ConfigService } from "@nestjs/config";
import { GetDiagnosticsRet, InitSession, UploadRes } from "./dtos/upload.dto";
import { getUserFromHeaders } from "src/utils/parse.util";
import { UploadService } from "./providers/uploadService.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadStatus } from "./schemas/upload.schema";
import { JobRunner } from "./providers/jobRunner.service";
import * as path from 'path';

@Controller('/ai')
export class AiController {
    constructor(private configService: ConfigService, private dbUser: DBUser, private uploadService: UploadService, private jobRunner: JobRunner) {}

    @Post('/initUploadSession')
    async initiateUploadSession(@Headers() headers, @Body() data: InitSession): Promise<UploadRes> {
        if(data.num_files <= 0) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'Number of files must be greater than 0',
            }, HttpStatus.BAD_REQUEST);
        }
        if(data.num_files > 20) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'Number of files must be no more than 20',
            }, HttpStatus.BAD_REQUEST);
        }

        let user = await getUserFromHeaders(headers, this.dbUser)
        user.metrics.numDirectoriesUploaded += 1;
        await this.dbUser.updateUser(user);

        const existingUploads = await this.uploadService.getUserUploads(user);
        for(let upload of existingUploads) {
            if(upload.status === UploadStatus.QUEUED) {
                await this.jobRunner.removeJob(upload.uid);
            }
            await this.uploadService.changeUploadStatus(upload, UploadStatus.STOPPED);
        }

        const upload = await this.uploadService.createUpload(data, user);
        this.jobRunner.uploadMap.set(upload.uid, []);
        return {
            uid: upload.uid
        }
    }

    @Post('/uploadFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File, 
        @Body() data, 
        @Headers() headers
    ) {
        if (!data?.uid) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'No Upload ID was specified.',
            }, HttpStatus.BAD_REQUEST);
        }

        if (!data?.path) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'No file path was specified.',
            }, HttpStatus.BAD_REQUEST);
        }

        const validCodeExtensions: string[] = [
            '.txt',      // Plain text files
            '.md',       // Markdown files
            '.py',       // Python files
            '.js',       // JavaScript files
            '.ts',       // TypeScript files
            '.css',      // CSS files
            '.html',     // HTML files
            '.json',     // JSON files
            '.xml',      // XML files
            '.yaml',     // YAML files
            '.ini',      // Configuration files
            '.conf',     // Configuration files
            '.sh',       // Shell script files
            '.bash',     // Bash script files
            '.zsh',      // Zsh script files
            '.php',      // PHP files
            '.rb',       // Ruby files
            '.java',     // Java files
            '.c',        // C source code files
            '.cpp',      // C++ source code files
            '.cs',       // C# files
            '.go',       // Go source files
            '.swift',    // Swift source code files
            '.rs',       // Rust source code files
            '.kt',       // Kotlin source files
            '.sql',      // SQL files
            '.r',        // R programming language files
            '.d',        // D programming language files
            '.h',        // C/C++ header files
            '.hpp',      // C++ header files
            '.lisp',     // Lisp files
            '.clj',      // Clojure files
            '.scala',    // Scala files
            '.pl',       // Perl files
            '.tex',      // LaTeX files
            '.coffee',   // CoffeeScript files
            '.less',     // Less CSS files
            '.sass',     // Sass files
            '.scss',     // SCSS files
            '.v',        // V programming language files
            '.ahk',      // AutoHotKey scripts
            '.lua',      // Lua files
            '.awk',      // AWK files
            '.xsd'       // XML Schema files
          ];          

        if(!validCodeExtensions.includes(path.extname(file.originalname).toLowerCase())) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'File type is not allowed',
            }, HttpStatus.BAD_REQUEST);
        }

        if(file.size > 1_000_000) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'File is too large',
            }, HttpStatus.BAD_REQUEST);
        }
    
        const user = await getUserFromHeaders(headers, this.dbUser);
    
        if (!data.uid.includes(user.uid)) {
            throw new HttpException({
                status: HttpStatus.UNAUTHORIZED,
                error: 'No such upload ID associated with user',
            }, HttpStatus.UNAUTHORIZED);
        }
    
        await this.dbUser.incrementAPICalls(user);
    
        let upload = await this.uploadService.getUpload(data.uid);
        if (!upload) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'No such upload exists. Please initiate an upload first.',
            }, HttpStatus.BAD_REQUEST);
        }
    
        if (upload.status === UploadStatus.INITIATED) {
            upload = await this.uploadService.changeUploadStatus(upload, UploadStatus.IN_PROGRESS);
        }
        
        // Any upload that isn't in progress already should not be able to be uploaded to
        if(upload.status !== UploadStatus.IN_PROGRESS) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'This upload has already been completed or terminated.',
            }, HttpStatus.BAD_REQUEST);
        }
        
        if (upload.uploaded_files.length >= upload.num_files) {
            throw new HttpException({
                status: HttpStatus.UNAUTHORIZED,
                error: `User has already uploaded ${upload.num_files} files`,
            }, HttpStatus.UNAUTHORIZED);
        }
    
        const uploadedFile = await this.uploadService.addFile(upload, file, data?.path, this.jobRunner.uploadMap);
        return { uploaded: uploadedFile };
    }

    @Post('/scanUpload')
    async scanUpload(@Body() data: UploadRes, @Headers() headers) {
        const user = await getUserFromHeaders(headers, this.dbUser);
        if (!data.uid.includes(user.uid)) {
            throw new HttpException({
                status: HttpStatus.UNAUTHORIZED,
                error: 'No such upload ID associated with user',
            }, HttpStatus.UNAUTHORIZED);
        }
    
        await this.dbUser.incrementAPICalls(user);
    
        let upload = await this.uploadService.getUpload(data.uid);
        if (!upload) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'No such upload exists. Please initiate an upload first.',
            }, HttpStatus.BAD_REQUEST);
        }

        if(upload.status !== UploadStatus.IN_PROGRESS) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'Upload session has already been terminated, completed, or has not been uploaded to.',
            }, HttpStatus.BAD_REQUEST);
        }

        const position = await this.jobRunner.addJob(upload.uid);
        await this.uploadService.changeUploadStatus(upload, UploadStatus.QUEUED);

        return {
            position: position
        };
    }

    @Post('/getDiagnostics')
    async getDiagnostics(@Body() data: UploadRes): Promise<GetDiagnosticsRet> {
        const upload = await this.uploadService.getUpload(data.uid);
        if(!upload) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'No such upload exists. Please initiate an upload first.',
            }, HttpStatus.BAD_REQUEST);
        }
        switch(upload.status) {
            case UploadStatus.QUEUED:
                const jobPosition = await this.jobRunner.getJobPos(upload.uid);
                if(jobPosition === -1) {
                    throw new HttpException({
                        status: HttpStatus.BAD_REQUEST,
                        error: 'This upload is no longer in the queue. Please try again.',
                    }, HttpStatus.BAD_REQUEST);
                }
                return {
                    status: `Upload at position ${jobPosition} in queue`,
                    diagnostics: null
                }
            case UploadStatus.FAILED:
                return {
                    status: `Scan failed. ${upload.uploadError}`,
                    diagnostics: null
                }
            case UploadStatus.COMPLETED:
                return {
                    status: `Scan completed`,
                    diagnostics: upload.diagnostics
                }
            default:
                throw new HttpException({
                    status: HttpStatus.BAD_REQUEST,
                    error: 'This upload has not been queued.',
                }, HttpStatus.BAD_REQUEST);
        }
    }
}