import { Injectable } from "@nestjs/common";
import { Queue } from "src/utils/queue.util";
import { UploadService } from "./uploadService.service";
import { Context, ContextFiles, File } from "../dtos/upload.dto";
import { Diagnostic, UploadStatus } from "../schemas/upload.schema";
import { ChromaClient, DefaultEmbeddingFunction } from "chromadb";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JobRunner {
    private queue: Queue;
    private isRunning: boolean;
    public uploadMap: Map<string, File[]>;
    private client: ChromaClient;
    private emFunction: DefaultEmbeddingFunction;
    private gpt_api_key: string;
    private GPT_ENDPOINT: string;

    constructor(private uploadService: UploadService, private configService: ConfigService) {
        this.queue = new Queue();
        this.isRunning = false;
        this.uploadMap = new Map();
        this.client = new ChromaClient();
        this.emFunction = new DefaultEmbeddingFunction();
        this.gpt_api_key = configService.get("GPT_API_KEY");
        this.GPT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
    }

    async getJobPos(uid: string): Promise<number> {
        return this.queue.findJob(uid);
    }

    async addJob(uid: string): Promise<number> {
        const jobPosition = this.queue.addJob(uid);
        if (!this.isRunning) {
            this.startProcessing();
        }
        return jobPosition;
    }

    private async startProcessing() {
        this.isRunning = true;

        while (this.queue.size() > 0 || this.queue.paused()) {
            if (this.queue.paused()) {
                console.log('OpenAI Rate Limited. Jobs paused.')
                await this.sleep(this.queue["sleepTime"]);
                this.queue.resume();
                continue;
            }

            const job = this.queue.front();
            if (job) {
                await this.processJob(job);
            }
        }

        this.isRunning = false;
    }

    private async processJob(uid: string) {
        const BATCH_SIZE = 2;

        let upload = await this.uploadService.getUpload(uid);
        try {
            console.log(`Processing job with ID: ${uid}`);
            let diagnostics: Diagnostic[] = [];
            
            let contents = this.uploadMap.get(uid);
            if(!contents || contents.length === 0) {
                throw "No file contents found."
            }
            contents.sort((a, b) => b.contents.length - a.contents.length || b.contents.localeCompare(a.contents))

            const result: ContextFiles[][] = [];
            while (contents.length > 0) { // Greedy file pairing (largest file with smaller files)
                const group: ContextFiles[] = [];

                const largest_file = contents.shift();
                //const context = await this.getContext(largest_file);
                const data: ContextFiles = {
                    file: largest_file,
                    context: null
                }
                group.push(data);

                for(let i = 0; i < BATCH_SIZE - 1; i++) {
                    if (contents.length > 0) {
                        const file = contents.pop()
                        //const context = await this.getContext(file);
                        const data: ContextFiles = {
                            file: file,
                            context: null
                        }
                        group.push(data)
                    }
                }

                result.push(group);
            }

            
            for(const batch of result) {
                let inputs = "";
                //let context = "You are an application that identifies vulnerabilities in code.\nIgnore vulnerabilities and context that cannot be exploited, or are negligible.\nYou will be given file names and their contents. A warning is something that is bad code practice. \n\nReturn JSON in the following format:\n\n{\"issues\": [{\"file_path\": file_path, {\n    \"issues\": [\n        { \"lineNumber\": 1, \"severity\": \"warning\" | \"critical\", \"synopsis: \"A short description of the vulnerability, including suggested remediation. Include the function signature or responsible code, in backticks, if applicable.\" }\n    ]\n}}]}\nThe following are examples of code that is similar and is known to contain a vulnerability or more. You are given the languages it uses and a description of the vulnerabilities along with the vulnerable lines (ignore if empty):\n";
                for(const context_file of batch) {
                    let lines = context_file.file.contents.split("\n");
                    for (let i=0; i<lines.length; i++) {
                        lines[i] = `${i + 1}. ` + lines[i];
                    }
                    const content = lines.join("\n")

                    inputs += `${context_file.file.path}\n${content}\n\n`;
                    /*
                    if(context_file.context) {
                        const input_context = context_file.context;
                        context += `Context for ${context_file.file.name}\nLanguages: ${input_context.langs}\nVulnerability: ${input_context.vulnerability}\nVulnerable Line/Description: ${input_context.vulnerable_line}\n${input_context.description}\n${input_context.document}\n`
                    }
                    */
                }

                try {
                    const ai_res = await this.getAIDiagnosis(inputs);
                    inputs += `\n${ai_res}`
    
                    const batch_diagnostics = await this.getAIAnalysis(inputs);

                    diagnostics = diagnostics.concat(batch_diagnostics);
                } catch(err) {
                    // If response fails due to rate limiting, get the timeout amount from headers, pause the queue, add this job back to the front of it, and sleep for that long
                    console.log(err)
                    console.log("Blocking queue and sleeping...")
                    this.queue.pushFront(uid);
                    this.queue.pause(60000);
                    return;
                }
            }

            upload.diagnostics = diagnostics;
            upload = await this.uploadService.modifyUpload(upload);

            await this.uploadService.changeUploadStatus(upload, UploadStatus.COMPLETED);
            console.log(`Completed job with ID: ${uid}`);

            await this.queue.dequeue();
            this.uploadMap.delete(uid);
        } catch (error) {
            console.log(error)
            await this.uploadService.changeUploadStatus(upload, UploadStatus.FAILED);
            upload.uploadError = error as string;
            await this.uploadService.modifyUpload(upload);
        }
    }

    private async getAIDiagnosis(inputs: string): Promise<string> {
        const context = 'You are a cybersecurity expert tasked with analyzing the following code for potential vulnerabilities. Identify potential vulnerabilities: Carefully examine the code for common Vulnerabilities such as Injection attacks (SQL injection, command injection), Authentication/authorization issues (insecure password storage, insufficient authorization checks), Denial of Service attacks (resource exhaustion), Cross-Site Scripting (XSS), Exposed Credentials. You will be given line numbers in the input as well as file paths for the different files and their contents. Return a JSON output in the following format:  {"vulnerabilities": [{"file_path": "[vulnerable file path]", "file_name": "[vulnerable file name]", "line_number": 10 (line of issue), "severity": "warning | critical", "vulnerability": "[vulnerability]", "reasoning": "provide reasoning"}]} (combine all the outputs into this JSON array)';

        const res = await fetch(
            this.GPT_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.gpt_api_key}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [
                        {
                            role: "system",
                            content: context
                        },
                        {
                            role: "user",
                            content: inputs
                        }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0,
                    max_tokens: 2000,
                    top_p: 1,
                    stream: false,
                })
            }
        );
        const json = await res.json();
        console.log(json.choices[0].message)
        const ai_res = json.choices[0].message.content;
        return ai_res
    }

    private async getAIAnalysis(inputs: string): Promise<Diagnostic[]> {
        const check_context = 'You are a cybersecurity auditor. You are given a piece of code and a JSON output containing potential vulnerabilities identified by another AI in the form of Code:[Original Code], Analysis:[JSON Output from the previous analysis]. Reason through the code to confirm or refute the reasoning for each vulnerability identified in the JSON report. Determine if the reasoning is valid and if the vulnerability identified could be meaningfully exploited. Based on your findings, update the report. If a vulnerability is confirmed, keep the entry. If a vulnerability is not found, reasoning is invalid or has no security implications, remove or modify the entry accordingly. If you discover any additional vulnerabilities not listed in the JSON report, add new entries to the JSON array of vulnerabilites in the same format as the existing entries. Return JSON in this format: {"vulnerabilities": [{"file_path": "[vulnerable file path]", "file_name": "[vulnerable file name]", "line_number": 10 (line of issue), "severity": "warning | critical", "vulnerability": "[vulnerability]", "reasoning": "provide reasoning"}]}. Do NOT change the format of the entry and do not give a null field to any part of the entry.';
        const res = await fetch(
            this.GPT_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.gpt_api_key}`
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages: [
                        {
                            role: "system",
                            content: check_context
                        },
                        {
                            role: "user",
                            content: inputs 
                        }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0,
                    max_tokens: 2000,
                    top_p: 1,
                    stream: false,
                })
            }
        );
        const json = await res.json()
        console.log(json)
        const batch_diagnostics: Diagnostic[] = JSON.parse(json.choices[0].message.content)["vulnerabilities"];
        return batch_diagnostics;
    }

    // Using a vector embedding approach to serve context to AI
    private async getContext(file: File): Promise<Context | null> {
        const QUERY_THRESHOLD = 0.8;
        const coll = await this.client.getCollection({ 
            name: "data", 
            embeddingFunction: this.emFunction
        })

        const query_res = await coll.query({
            queryEmbeddings: await this.emFunction.generate([file.contents]),
            nResults: 1,
        })
        const metadata = query_res.metadatas[0][0]
        let context: Context | null = null;
        if(query_res.distances[0][0] < QUERY_THRESHOLD) {
            context = {
                langs: metadata["lang"] as string,
                vulnerability: metadata["vulnerability"] as string,
                vulnerable_line: metadata["vulnerable_line"] as string,
                description: metadata["description"] as string,
                document: query_res.documents[0][0]
            }
        }
        return context
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async removeJob(uid: string) {
        await this.queue.removeJob(uid);
    }
}
