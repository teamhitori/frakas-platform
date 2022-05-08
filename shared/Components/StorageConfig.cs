using Azure.Storage;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using TeamHitori.Mulplay.shared.storage;


public class StorageConfig : IStorageConfig
{
    public StorageConfig(DocumentDBRepository dBRepository, BlobServiceClient blobServiceClient, StorageSharedKeyCredential storageSharedKeyCredential, ILogger logger, IDatabase? cache)
    {
        //var blobServiceClient = new BlobServiceClient(connectionString);
        DBRepository = dBRepository;
        StorageSharedKeyCredential = storageSharedKeyCredential;
        BlobServiceClient = blobServiceClient;
        Logger = logger;
        Cache = cache;
    }
    public DocumentDBRepository DBRepository { get; private set; }

    public BlobServiceClient BlobServiceClient { get; private set; }

    public StorageSharedKeyCredential StorageSharedKeyCredential { get; private set; }

    public IDatabase? Cache { get; set; }

    public ILogger Logger { get; }


}
