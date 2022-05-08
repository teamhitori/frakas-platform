using Azure.Storage;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using TeamHitori.Mulplay.shared.storage;

public static class StorageExtensions
{
    public static IStorageConfig CreateStorage(
       IConfiguration configuration,
       ILogger logger)
    {

        var blobConnectionString = configuration["Azure:Blob:ConnectionString"];
        var cacheConnectionString = configuration["Azure:Redis:ConnectionString"];
        var endpoint = configuration["Azure:Cosmos:Endpoint"];
        var key = configuration["Azure:Cosmos:Key"];
        var databaseId = configuration["Azure:Cosmos:DatabaseId"];
        var collectionId = configuration["Azure:Cosmos:CollectionId"];
        var cache = string.IsNullOrEmpty(cacheConnectionString) ? null : ConnectionMultiplexer.Connect(cacheConnectionString).GetDatabase();

        return CreateStorage(blobConnectionString, endpoint, key, databaseId, collectionId, logger, cache);
    }

    public static IStorageConfig CreateStorage(
       string blobConnectionString,
       string endpoint,
       string key,
       string databaseId,
       string collectionId,
       ILogger log,
       IDatabase? cache)
    {
        var blobServiceClient = new BlobServiceClient(blobConnectionString);
        var blobConnDict = blobConnectionString.Split(";")
            .Select(x => x.Split("=", 2))
            .ToDictionary(s => s[0], s => s[1]);
        var sharedKeyCred = new StorageSharedKeyCredential(blobConnDict["AccountName"], blobConnDict["AccountKey"]);

        var repository = new DocumentDBRepository(
            endpoint,
            key,
            databaseId,
            collectionId,
            log);


        //create storage
        var storageConfig = new StorageConfig(repository, blobServiceClient, sharedKeyCred, log, cache);

        return storageConfig;
    }

    public static Storage ToUserStorage(this IStorageConfig storageConfig, HttpContext httpContext)
    {
        var asUserId = httpContext.User.Claims.FirstOrDefault(claim =>
                claim.Type == "http://schemas.microsoft.com/identity/claims/objectidentifier" ||
                claim.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
            )?.Value ??
            "1111-1111-1111-1111-1111";

        var storage =  new Storage(
            storageConfig.DBRepository,
            storageConfig.BlobServiceClient,
            storageConfig.StorageSharedKeyCredential,
            asUserId,
            storageConfig.Logger,
            storageConfig.Cache);

        return storage;
    }

    public static Storage ToUserStorage(this IStorageConfig storageConfig, String asUserId)
    {
        return new Storage(
            storageConfig.DBRepository,
            storageConfig.BlobServiceClient,
            storageConfig.StorageSharedKeyCredential,
            asUserId,
            storageConfig.Logger,
            storageConfig.Cache);
    }

    //public static async Task revokeSasPolicy(this Storage storage, string forUserId = null)
    //{
    //    var res = await storage.BlobServiceClient.GetUserDelegationKeyAsync(DateTimeOffset.UtcNow,
    //                                                                DateTimeOffset.UtcNow.AddSeconds(7));

    //}

    public static string GetSasToken(this Storage storage, BlobSasPermissions blobSasPermissions, string autoDelete = "Day1")
    {
        // Get a user delegation key for the Blob service that's valid for seven days.
        // You can use the key to generate any number of shared access signatures over the lifetime of the key.
        //UserDelegationKey key = await storage.BlobServiceClient.GetUserDelegationKeyAsync(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddDays(7));

        var sharedAccessExpiryTime = DateTime.UtcNow.AddDays(7);
        switch (autoDelete)
        {
            case "Hours1":
                sharedAccessExpiryTime = DateTime.UtcNow.AddHours(1);
                break;
            case "Hours12":
                sharedAccessExpiryTime = DateTime.UtcNow.AddHours(12);
                break;
            case "Day1":
                sharedAccessExpiryTime = DateTime.UtcNow.AddDays(1);
                break;
            case "Week1":
                sharedAccessExpiryTime = DateTime.UtcNow.AddDays(7);
                break;
            case "Week2":
                sharedAccessExpiryTime = DateTime.UtcNow.AddDays(14);
                break;
            case "Week4":
                sharedAccessExpiryTime = DateTime.UtcNow.AddDays(28);
                break;
        }

        // Create a SAS token that's valid for one hour.
        BlobSasBuilder sasBuilder = new BlobSasBuilder()
        {
            BlobContainerName = storage.BlobContainerClient.Name,
            Resource = "b",
            StartsOn = DateTimeOffset.UtcNow,
            ExpiresOn = sharedAccessExpiryTime
        };

        // Specify read permissions for the SAS.
        sasBuilder.SetPermissions(blobSasPermissions);

        // Use the key to get the SAS token.
        string sasToken = sasBuilder.ToSasQueryParameters(storage.StorageSharedKeyCredential).ToString();

        return $"?{sasToken}";
    }

    public static async Task<IEnumerable<string>> ListFilesAsync(this Storage storage)
    {
        var items = new List<string>();

        try
        {
            storage.LogInformation("get-assets Called");


            var resultSegment = storage.BlobContainerClient.GetBlobsAsync()
                .AsPages(default, 50);

            // Enumerate the blobs returned for each page.
            await foreach (Azure.Page<BlobItem> blobPage in resultSegment)
            {
                foreach (BlobItem blobItem in blobPage.Values)
                {
                    items.Add(blobItem.Name);
                }
            }
        }
        catch (Exception ex)
        {
            storage.LogError($"Error Calling Storage ${storage.UserId}", ex);
        }

        return items;
    }
}
