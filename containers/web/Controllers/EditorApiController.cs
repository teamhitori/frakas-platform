

using Microsoft.AspNetCore.Mvc;
using TeamHitori.Mulplay.shared.storage;
using Microsoft.AspNetCore.Authorization;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

[Route("api/[controller]")]
[ApiController]
[Authorize(AuthenticationSchemes = $"{JwtBearerDefaults.AuthenticationScheme},{OpenIdConnectDefaults.AuthenticationScheme}")]
public class EditorApiController : ControllerBase
{
    private readonly ILogger<EditorApiController> _logger;
    private readonly GameContainer _gameHub;
    private readonly IStorageConfig _storageConfig;
    private GameContainer _gameContainer;
    private readonly IHttpService _httpService;

    public EditorApiController(
        ILogger<EditorApiController> logger,
        GameContainer gameHub,
        IStorageConfig storageConfig,
        GameContainer gameContainer,
        IHttpService httpService
        )
    {
        _logger = logger;
        _gameHub = gameHub;
        this._storageConfig = storageConfig;
        _gameContainer = gameContainer;
        this._httpService = httpService;
    }

    [HttpGet("create-game/{gameName}")]
    public async Task<GameInstanceSource?> createGame(string gameName, [FromQuery(Name = "isDebug")] bool isDebug = true)
    {
        try
        {
            var gameInstances = _gameContainer.ActiveGameInstances;
            var userName = User.GetUserName();
            var publishedGameName = gameName.ToLower().Replace(" ", "-");

            var storage = _storageConfig.ToUserStorage(HttpContext);
            storage.LogInformation($"create-game  Called");

            if (!gameName.IsValidGameName())
            {
                storage.LogInformation($"Game name {gameName} is invalid");
                return null;
            }

            var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

            storagePublish.LogInformation("create-game Called");

            var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, gameName);
            var feRef = await storage.GetFECode(publishedGameName);
            var beRef = await storage.GetBECode(publishedGameName);

            if (string.IsNullOrEmpty(feRef) || string.IsNullOrEmpty(beRef)) return null;

            var activeInstance = gameInstances
                .FirstOrDefault(i =>
                    i.gameInstance.gameName == gameName &&
                    i.gameInstance.author == userName &&
                    i.gameInstance.isDebug == isDebug);

            if (activeInstance == null || true)
            {
                var gamePrimaryName = Guid.NewGuid().ToString();

                var gameInstance = new GameInstance(gameName, publishedGameName, gamePrimaryName, userName, "0.0.0.0", DateTime.Now.ToString("yyyy/MM/dd HH:mm:ssZ"), isDebug, false, true);

                activeInstance = new GameInstanceSource(feRef, beRef, gameDefinition.gameConfig, gameInstance);

                await _gameContainer.CreateGame(activeInstance);
            }

            return activeInstance;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex.Message);
            return null;
        }
    }

    [HttpGet("destroy-game/{gamePrimaryName}")]
    public async Task destroyGame(string gamePrimaryName)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"destroy-game/{gamePrimaryName}  Called");

        await _gameContainer.DestroyGame(gamePrimaryName);
    }

    [HttpPost("upsert-config/{gameName}")]
    public async Task<bool> UpsertConfig(string gameName, [FromBody] GameConfig gameConfig)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"upsert-config/{gameName}  Called");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return false;
        }

        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        try
        {
            // primaryNameIn - case insensitive
            await storage.Upsert(gameConfig, primaryNameIN: publishedGameName);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex.Message);
        }

        return false;
    }

    [HttpPost("upsert-code")]
    public async Task<bool> UpsertCode([FromBody] IEnumerable<CodeFile> codeFiles)
    {
        string? userName = User.GetUserName();
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"upsert-code Called");

        try
        {
            foreach (var codeFile in codeFiles)
            {
                if (!codeFile.gameName.IsValidGameName())
                {
                    storage.LogInformation($"Game name {codeFile.gameName} is invalid");
                    return false;
                }

                // primaryNameIn - case insensitive
                await storage.Upsert(codeFile, primaryNameIN: $"{codeFile.gameName}:{codeFile.fileName}");
            }

            if (codeFiles.Any())
            {
                var body = codeFiles.ToDictionary(key => $"{key.fileName}", val => $"{val.code}");
                var bodyStr = body.ToJDoc().content;

                _gameContainer.StartCompile(storage.UserId, userName, codeFiles.First().gameName, bodyStr);
            }

            //await _gameContainer.NotifyReload(gameLogic.gameName);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex.Message);
        }

        return false;
    }



    [HttpGet("get-active/{gameName}")]
    public IEnumerable<GameInstance> getActive(string gameName)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-active/{gameName} Called");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var gameInstances = _gameContainer.ActiveGameInstances;
        return gameInstances
            .Where(inst => inst.gameInstance.gameName == gameName &&
            inst.gameInstance.author == userName &&
            inst.gameInstance.isDebug)
            .Select(inst => inst.gameInstance);
    }

    [HttpGet("get-assets/{gameName}")]
    public async Task<IEnumerable<string>> GetAssets(string gameName)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-assets/{gameName} Called");

        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");
        var items = new List<string>();

        try
        {
            storagePublish.LogInformation("get-assets Called");


            var resultSegment = storagePublish.BlobContainerClient.GetBlobsAsync()
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
            storagePublish.LogError($"Error Calling Storage ${storagePublish.UserId}", ex);
            return null;
        }

        return items;
    }

    [HttpGet("get-all")]
    public async Task<IEnumerable<string>> getAll()
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-all");

        var gameDefs = await storage.FindAllByType<GameConfig>();

        return gameDefs.Select(x => x.GetObject().gameName).Where(name => !string.IsNullOrEmpty(name));
    }

    [HttpGet("get-source-feref/{gameName}")]
    public async Task<string> getFERef(string gameName)
    {
        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-source-feref/{gameName}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        var feRef = await storage.GetFECode(publishedGameName);

        return feRef.ToJDoc().content;
    }

    [HttpGet("create-definition/{gameName}")]
    public async Task<GameDefinition> CreateDefinition(string gameName)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"create-definition/{gameName}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

        await storagePublish.BlobContainerClient.CreateIfNotExistsAsync();

        await storagePublish.BlobContainerClient.SetAccessPolicyAsync(PublicAccessType.Blob);

        storage.LogInformation("Game Get Called");

        var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, gameName);

        return gameDefinition;
    }

    [HttpGet("get-definition/{publishedGameName}")]
    public async Task<GameDefinition> getDefinition(string publishedGameName)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-definition/{publishedGameName}");

        var gameName = publishedGameName.Replace("-", " ");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {publishedGameName} is invalid");
            return null;
        }

        // To lower
        var userName = User.GetUserName();

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

        await storagePublish.BlobContainerClient.CreateIfNotExistsAsync();

        await storagePublish.BlobContainerClient.SetAccessPolicyAsync(PublicAccessType.Blob);

        var uri = storagePublish.BlobContainerClient.Uri;

        storage.LogInformation("Game Get Called");

        var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, gameName);

        return gameDefinition;
    }

    [HttpGet("get-publish-definition/{gameName}")]
    public async Task<PublishedDefinition> getPublishDefinition(string gameName)
    {
        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-publish-definition/{gameName}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

        var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, gameName);

        var publishedDefinition = PublishedDefinitionExtensions.GetLatest(gameDefinition, _gameContainer, userName);

        return publishedDefinition;
    }

    [HttpGet("get-code/{gameName}/{codeType}")]
    public async Task<CompiledCode> getLogic(string gameName, CodeType codeType)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-logic/{gameName}/{codeType}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var gameLogicDoc = await storage.FindDocumentByPrimaryName<CompiledCode>($"{publishedGameName}:{codeType}");
        var gameLogic = gameLogicDoc?.GetObject();

        return gameLogic;
    }

    [HttpPost("get-instance-pn/{gameName}")]
    public string GetPublishedInstancePrimaryName(string gameName)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-instance-pn/{gameName}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        // TO LOWER
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        // VERSIONING
        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");
        var publishProfile = storagePublish.GetSingleton<PublishProfile>()?.Result.GetObject();

        if (publishProfile == null)
        {
            return null;
        }

        var gameInstances = _gameContainer.ActiveGameInstances;
        var activeInstance = gameInstances.FirstOrDefault(i => i.gameInstance.gameName == gameName &&
            i.gameInstance.author == userName &&
            i.gameInstance.version == publishProfile.version);

        return activeInstance == null ? string.Empty.ToJDoc().content : activeInstance.gameInstance.gamePrimaryName.ToJDoc().content;

    }

    [HttpGet("get-config/{gameName}")]
    public async Task<GameConfig> getConfig(string gameName)
    {
        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"get-config/{gameName}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return null;
        }

        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var gameConfigDoc = await storage.FindDocumentByPrimaryName<GameConfig>(publishedGameName);
        var gameConfig = gameConfigDoc?.GetObject();

        return gameConfig;
    }

    [HttpGet("publish/{gameName}")]
    public async Task<bool> Publish(string gameName)
    {
        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"publish/{gameName}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return false;
        }

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

        var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, gameName);
        var feRef = await storage.GetFECode(publishedGameName);
        var beRef = await storage.GetBECode(publishedGameName);

        var publishProfile = new PublishProfile(gameDefinition, feRef, beRef, userName, "0.0.0.0", DateTime.Now, false);

        await storagePublish.Upsert(publishProfile, true);

        var gameInstances = _gameContainer.ActiveGameInstances;
        var activeInstance = gameInstances.FirstOrDefault(i => i.gameInstance.gameName == gameName &&
            i.gameInstance.author == userName &&
            i.gameInstance.version == publishProfile.version);

        if (activeInstance != null)
        {
            await _gameContainer.DestroyGame(activeInstance.gameInstance.gamePrimaryName);
            activeInstance = null;
        }

        if (activeInstance == null)
        {
            var gamePrimaryName = Guid.NewGuid().ToString();

            var gameInstance = new GameInstance(gameName, publishedGameName, gamePrimaryName, userName, publishProfile.version, DateTime.Now.ToString("yyyy/MM/dd HH:mm:ssZ"), false, false, false);
            activeInstance = new GameInstanceSource(feRef, beRef, gameDefinition.gameConfig, gameInstance);

            await _gameContainer.CreateGame(activeInstance);

        }

        return true;
    }

    [HttpGet("un-publish/{gameName}")]
    public async Task<bool> UnPublish(string gameName)
    {
        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"un-publish/{gameName}");

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return false;
        }

        var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, gameName);
        var feRef = await storage.GetFECode(publishedGameName);
        var beRef = await storage.GetBECode(publishedGameName);

        var publishProfile = new PublishProfile(gameDefinition, feRef, beRef, userName, "0.0.0.0", DateTime.Now, false);

        var doc = storagePublish.CreateSingleton(publishProfile);

        await storagePublish.DeleteDocument(doc);

        return true;
    }

    [HttpGet("enable-debug/{gameName}/{enable}")]
    public async Task EnableDebug(string gameName, Boolean enable)
    {
        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"enable-debug/{gameName}/{enable}");

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

        var publishProfile = storagePublish.GetSingleton<PublishProfile>()?.Result.GetObject();

        if (publishProfile == null)
        {
            return;
        }

        await storagePublish.Upsert(publishProfile with { debugEnabled = enable }, true);

        // await  _gameContainer.EnableDebug($"{userName}:{gameName}", enable);
    }

    [HttpGet("game-action/{gameName}/{start}/{stop}")]
    public async Task GameAction(string gameName, bool start, bool stop)
    {
        // To lower
        var userName = User.GetUserName();
        var publishedGameName = gameName.ToLower().Replace(" ", "-");

        var storage = _storageConfig.ToUserStorage(HttpContext);
        storage.LogInformation($"game-action/{gameName}/{start}/{stop}");

        if (!gameName.IsValidGameName())
        {
            storage.LogInformation($"Game name {gameName} is invalid");
            return;
        }

        var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

        var publishProfile = storagePublish.GetSingleton<PublishProfile>()?.Result.GetObject();

        if (publishProfile == null)
        {
            return;
        }

        var gameInstances = _gameContainer.ActiveGameInstances;
        var activeInstances = gameInstances.Where(i => i.gameInstance.gameName == gameName &&
            i.gameInstance.author == userName);

        if (stop && activeInstances.Any())
        {
            activeInstances.Foreach(async i =>
            {
                await _gameContainer.DestroyGame(i.gameInstance.gamePrimaryName);
            });
        }

        if (start)
        {
            var gamePrimaryName = Guid.NewGuid().ToString();

            var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, gameName);
            var feRef = await storage.GetFECode(publishedGameName);
            var beRef = await storage.GetBECode(publishedGameName);

            publishProfile = new PublishProfile(gameDefinition, feRef, beRef, userName, "0.0.0.0", DateTime.Now, false);

            await storagePublish.Upsert(publishProfile, true);

            var gameInstance = new GameInstance(gameName, publishedGameName, gamePrimaryName, userName, publishProfile.version, DateTime.Now.ToString("yyyy/MM/dd HH:mm:ssZ"), false, false, false);
            var activeInstance = new GameInstanceSource(feRef, beRef, gameDefinition.gameConfig, gameInstance);

            await _gameContainer.CreateGame(activeInstance);

            //await _gameContainer.EnableDebug($"{userName}:{gameName}", publishProfile.debugEnabled);
        }
    }
}