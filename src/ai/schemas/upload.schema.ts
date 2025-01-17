import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export enum UploadStatus {
    INITIATED = "initiated",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    STOPPED = "stopped",
    QUEUED = "queued",
    FAILED = "failed"
}

export class Diagnostic {
    file_path: string;
    file_name: string;
    from: number;
    to: number;
    vulnerability: string;
    severity: string;
    reasoning: string;
}

@Schema()
export class Upload {
    @Prop({ required: true })
    uid: string;

    @Prop({ required: true })
    upload_time: string;

    @Prop({ required: true })
    dir_name: string

    @Prop({ required: true })
    num_files: number;

    @Prop({ required: true })
    uploaded_files: string[]; //Can update this to an array of File objects if needed

    @Prop({ required: true })
    diagnostics: Diagnostic[]

    @Prop({ required: true })
    status: UploadStatus;

    @Prop({ required: false, default: "" })
    uploadError: string
}

export type UploadDocument = HydratedDocument<Upload>
export const UploadSchema = SchemaFactory.createForClass(Upload);