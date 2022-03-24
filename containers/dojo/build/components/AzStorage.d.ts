/// <reference types="node" />
export declare class AzStorage {
    private _blobServiceClient;
    constructor();
    downloadBESource(containerName: string, targetFolder: string): Promise<void>;
    streamToFile(fileName: string, readableStream: NodeJS.ReadableStream): void;
}
//# sourceMappingURL=AzStorage.d.ts.map