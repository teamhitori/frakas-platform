import { BlobServiceClient, StorageSharedKeyCredential, PublicAccessType } from "@azure/storage-blob";
import fs from 'fs';

export class AzStorage {

    private _blobServiceClient: BlobServiceClient;

    constructor() {

        var accountName = process.env.Azure__Blob__AccountName;
        var accountKey = process.env.Azure__Blob__AccountKey;

        if (!accountName || !accountKey) {
            throw "missing AZ Storage AccountName / AccountKey";
        }

        // Use StorageSharedKeyCredential with storage account and account key
        // StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        // List containers
        this._blobServiceClient = new BlobServiceClient(
            // When using AnonymousCredential, following url should include a valid SAS or support public access
            `https://${accountName}.blob.core.windows.net`,
            sharedKeyCredential
        );
    }

    public async downloadBESource(containerName: string, targetFolder: string) {

        try {
            if (!fs.existsSync("/usersource")) {
                console.log("Creating usersource");
                fs.mkdirSync("/usersource");
            }

            if (!fs.existsSync(`/usersource/${targetFolder}/`)) {
                console.log(`Creating usersource/${targetFolder}/`);
                fs.mkdirSync(`/usersource/${targetFolder}/`);
            }

            const containerClient = this._blobServiceClient.getContainerClient(containerName);

            // List the blob(s) in the container.
            for await (const blob of containerClient.listBlobsFlat()) {
                console.log(blob.name);

                const blockBlobClient = containerClient.getBlockBlobClient(blob.name);

                const downloadBlockBlobResponse = await blockBlobClient.download(0);

                downloadBlockBlobResponse.readableStreamBody
                    ?.on('error', console.error)
                    .pipe(fs.createWriteStream(`/usersource/${targetFolder}/${blob.name}`));
                console.log(`Downloaded ${blob.name} to /usersource/${targetFolder}/${blob.name}`);
            }

            console.log("Download complete")
        } catch (err) {
            console.log(err);
        }

    }

    streamToFile(fileName: string, readableStream: NodeJS.ReadableStream) {
        readableStream
    }

}