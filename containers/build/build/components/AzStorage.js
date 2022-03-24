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
    async uploadSource(containerName, folder) {
        // Create a container
        containerName = containerName.toLocaleLowerCase().replace(" ", "-");
        const containerClient = this._blobServiceClient.getContainerClient(containerName);
        const createContainerResponse = await containerClient.createIfNotExists({ access: "blob" });
        console.log(`Create container ${containerName} successfully`, createContainerResponse.requestId);
        fs_1.default.readdir(folder, (err, files) => {
            files.forEach(async (file) => {
                //const blobName = "newblob" + new Date().getTime();
                const blockBlobClient = containerClient.getBlockBlobClient(file);
                const uploadBlobResponse = await blockBlobClient.uploadFile(`${folder}${file}`);
                console.log(`Upload ${folder}${file} to ${containerName}/${file} successfully`, uploadBlobResponse.requestId);
            });
        });
        return containerClient.url;
    }
}
exports.AzStorage = AzStorage;
// export async function main() {
//     // Enter your storage account name and shared key
//     const account = process.env.ACCOUNT_NAME || "hitorimulplaydev";
//     const accountKey = process.env.ACCOUNT_KEY || "IZXUk1CsAWDjRtGetCCeEHd1uwZjD72S/BiqehE7LLrZvTfFYkICmq8UhU9R2mc3zzUgwM/5JvDRxDyBM4bPCg==";
//     // Use StorageSharedKeyCredential with storage account and account key
//     // StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
//     const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
//     // List containers
//     const blobServiceClient = new BlobServiceClient(
//         // When using AnonymousCredential, following url should include a valid SAS or support public access
//         `https://${account}.blob.core.windows.net`,
//         sharedKeyCredential
//     );
//     let i = 1;
//     for await (const container of blobServiceClient.listContainers()) {
//         console.log(`Container ${i++}: ${container.name}`);
//     }
//     // Create a container
//     const containerName = `newcontainer${new Date().getTime()}`;
//     const containerClient = blobServiceClient.getContainerClient(containerName);
//     const createContainerResponse = await containerClient.create();
//     console.log(`Create container ${containerName} successfully`, createContainerResponse.requestId);
//     // Create a blob
//     const content = "hello, 😀";
//     const blobName = "newblob" + new Date().getTime();
//     const blockBlobClient = containerClient.getBlockBlobClient(blobName);
//     const uploadBlobResponse = await blockBlobClient.upload(content, Buffer.byteLength(content));
//     console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
//     // List blobs
//     i = 1;
//     for await (const blob of containerClient.listBlobsFlat()) {
//         console.log(`Blob ${i++}: ${blob.name}`);
//     }
// }
//# sourceMappingURL=AzStorage.js.map