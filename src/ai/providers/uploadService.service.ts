import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Upload, UploadStatus } from "../schemas/upload.schema";
import { v4 } from "uuid";
import { File, InitSession } from "../dtos/upload.dto";
import { User } from "src/auth/schemas/user.schema";

@Injectable()
export class UploadService {
    constructor(@InjectModel(Upload.name) private upload: Model<Upload>) {}

    async createUpload(data: InitSession, user: User): Promise<Upload> {
        const newUpload = new this.upload({
            uid: `${user.uid}-${v4()}`,
            upload_time: new Date().getTime().toString(),
            dir_name: data.dir_name,
            num_files: data.num_files,
            uploaded_files: [],
            diagnostics: [],
            status: UploadStatus.INITIATED,
            uploadError: ""
        })

        return (await newUpload.save()).toJSON();
    }

    async addFile(
        upload: Upload, 
        file: Express.Multer.File, 
        path: string,
        map: Map<string, File[]>
    ): Promise<boolean> {
        const fileContent = file.buffer.toString();
        const existingContents = map.get(upload.uid);
    
        if (!existingContents) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: 'Upload was not initiated correctly',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        
        existingContents.push({
            name: file.originalname,
            path: path,
            contents: fileContent
        });
        map.set(upload.uid, existingContents);
    
        upload.uploaded_files.push(file.originalname);
    
        const { modifiedCount } = await this.upload.updateOne(
            { uid: upload.uid },
            { $set: upload }
        );
    
        return modifiedCount === 1;
    }    

    async changeUploadStatus(upload: Upload, newStatus: UploadStatus): Promise<Upload> {
        upload.status = newStatus;
        return await this.modifyUpload(upload);
    }

    async modifyUpload(upload: Upload): Promise<Upload> {
        await this.upload.updateOne({ uid: upload.uid }, {
            $set: upload
        })
        return upload
    }

    async getUpload(uid: string): Promise<Upload> {
        const upload = await this.upload.findOne({ uid: uid })
        return upload != null ? upload.toJSON() : upload;
    }

    async getUserUploads(user: User): Promise<Upload[]> {
        return await this.upload.find({
            uid: { $regex: new RegExp(user.uid, "i") },
            status: { $nin: [UploadStatus.STOPPED, UploadStatus.COMPLETED, UploadStatus.FAILED] }
        });
    }
}