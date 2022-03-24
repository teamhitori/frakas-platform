using Azure.Storage;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using StackExchange.Redis;
using TeamHitori.Mulplay.shared.storage;

public static class StorageExtensions
{
    public static IStorageConfig CreateStorage(
       //this IConfiguration configuration,
       string blobConnectionString,
       string containerName,
       string cacheConnectionString,
       string endpoint,
       string key,
       string databaseId,
       string collectionId,

       ILogger log)
    {

        if (String.IsNullOrEmpty(blobConnectionString))
        {
            throw new ArgumentException("blobConnectionString not set");
        }

        if (String.IsNullOrEmpty(containerName))
        {
            throw new ArgumentException("StorageContainerName not set");
        }

        if (String.IsNullOrEmpty(cacheConnectionString))
        {
            throw new ArgumentException("RedisConnectionString not set");
        }

        var cache = ConnectionMultiplexer.Connect(cacheConnectionString).GetDatabase();

        return CreateStorage(blobConnectionString, endpoint, key, databaseId, collectionId, log, cache);
    }

    public static IStorageConfig CreateStorage(
       string blobConnectionString,
       string endpoint,
       string key,
       string databaseId,
       string collectionId,
       ILogger log,
       IDatabase cache)
    {
        var blobServiceClient = new BlobServiceClient(blobConnectionString);
        var blobConnDict = blobConnectionString.Split(";")
            .Select(x => x.Split("=", 2))
            .ToDictionary(s => s[0], s => s[1]);
        var sharedKeyCred = new StorageSharedKeyCredential(blobConnDict["AccountName"], blobConnDict["AccountKey"]);

        //Random jitterer = new Random();
        //var policy = Policy
        //    .Handle<Exception>()
        //    .WaitAndRetry(6, (retryAttempt, timespan) =>
        //    {
        //        return TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))
        //                  + TimeSpan.FromMilliseconds(jitterer.Next(0, 100));
        //    }, (ex, timespan, retryCount, retryContext) =>
        //    {
        //        object methodThatRaisedException = retryContext["methodName"];
        //        log.LogError(ex, $"{ methodThatRaisedException }, retry: {retryCount}, timespan: {timespan}");
        //    });

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
                claim.Type == "http://schemas.microsoft.com/identity/claims/objectidentifier"
            )?.Value ??
            "1111-1111-1111-1111-1111";

        return new Storage(
            storageConfig.DBRepository,
            storageConfig.BlobServiceClient,
            storageConfig.StorageSharedKeyCredential,
            asUserId,
            storageConfig.Logger,
            storageConfig.Cache);
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
}
