"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzStorage = void 0;
const tslib_1 = require("tslib");
const storage_blob_1 = require("@azure/storage-blob");
const fs_1 = tslib_1.__importDefault(require("fs"));
class AzStorage {
    _blobServiceClient;
    constructor() {
        var accountName = process.env.Azure__Blob__AccountName;
        var accountKey = process.env.Azure__Blob__AccountKey;
        if (!accountName || !accountKey) {
            throw "missing AZ Storage AccountName / AccountKey";
        }
        // Use StorageSharedKeyCredential with storage account and account key
        // StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
        const sharedKeyCredential = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
        // List containers
        this._blobServiceClient = new storage_blob_1.BlobServiceClient(
        // When using AnonymousCredential, following url should include a valid SAS or support public access
        `https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    }
    async downloadBESource(containerName, targetFolder) {
        try {
            if (!fs_1.default.existsSync("/usersource")) {
                console.log("Creating usersource");
                fs_1.default.mkdirSync("/usersource");
            }
            if (!fs_1.default.existsSync(`/usersource/${targetFolder}/`)) {
                console.log(`Creating usersource/${targetFolder}/`);
                fs_1.default.mkdirSync(`/usersource/${targetFolder}/`);
            }
            const containerClient = this._blobServiceClient.getContainerClient(containerName);
            // List the blob(s) in the container.
            for await (const blob of containerClient.listBlobsFlat()) {
                console.log(blob.name);
                const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
                const downloadBlockBlobResponse = await blockBlobClient.download(0);
                downloadBlockBlobResponse.readableStreamBody
                    ?.on('error', console.error)
                    .pipe(fs_1.default.createWriteStream(`/usersource/${targetFolder}/${blob.name}`));
                console.log(`Downloaded ${blob.name} to /usersource/${targetFolder}/${blob.name}`);
            }
            console.log("Download complete");
        }
        catch (err) {
            console.log(err);
        }
    }
    streamToFile(fileName, readableStream) {
        readableStream;
    }
}
exports.AzStorage = AzStorage;
//# sourceMappingURL=AzStorage.js.map