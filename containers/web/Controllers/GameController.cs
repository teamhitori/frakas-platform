using Microsoft.AspNetCore.Mvc;
using TeamHitori.Mulplay.shared.storage;
using Microsoft.AspNetCore.Authorization;
using web.Components;

[AllowAnonymous]
public class GameController : Controller
{

    private readonly ILogger<EditorApiController> _logger;
    private readonly GameContainer _gameContainer;
    private readonly IStorageConfig _storageConfig;
    private readonly IConfiguration _configuration;

    public GameController(
        ILogger<EditorApiController> logger,
        GameContainer gameContainer,
        IStorageConfig storageConfig,
        IConfiguration configuration
        )

    {
        _logger = logger;
        _gameContainer = gameContainer;
        this._storageConfig = storageConfig;
        this._configuration = configuration;
    }

    [HttpGet("{publishedGameName?}")]
    public async Task<IActionResult> Index(string publishedGameName, [FromQuery(Name = "gamePrimaryName")] string gamePrimaryName)
    {
        if (User?.Identity?.IsAuthenticated == true)
        {
            if (string.IsNullOrEmpty(publishedGameName))
            {
                return Redirect("/Editor/");
            }

            // TO LOWER
            var userName = User.Identity.Name.ToLower();

            // VERSIONING
            var storage = _storageConfig.ToUserStorage(HttpContext);
            var storagePublish = _storageConfig.ToUserStorage($"{userName}-{publishedGameName}");

            var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName, false);

            if (gameDefinition == null)
            {
                return Redirect($"/Editor/{publishedGameName}");

            }

            var files = await storagePublish.ListFilesAsync();

            var gameInstances = _gameContainer.ActiveGameInstances;

            if (string.IsNullOrEmpty(gamePrimaryName))
            {
                var gameInstance = new GameInstance(gameDefinition.gameName, gameDefinition.publishedGameName, gamePrimaryName, userName, "0.0.0.0", DateTime.Now.ToString("yyyy/MM/dd HH:mm:ssZ"), false, false, false);
                var activeInstance = new GameInstanceSource(files, gameDefinition.gameConfig, gameInstance).MapToGameState(_configuration); ;

                return View("Index", activeInstance);

            }
            else
            {
                var gameState = gameInstances
                    .First(i =>
                        i.gameInstance.gameName == gameDefinition.gameName &&
                        i.gameInstance.gamePrimaryName == gamePrimaryName)
                    .MapToGameState(_configuration);

                return View("Index", gameState);
            }

        }
        else
        {
            return Redirect("/MicrosoftIdentity/Account/SignIn");
        }
    }

    [HttpGet("{author}/{publishGameName}")]
    public async Task<IActionResult> Index(string publishGameName, string author, [FromQuery(Name = "gamePrimaryName")] bool? gamePrimaryName)
    {
        // TO LOWER
        author = (author ?? String.Empty).ToLower();

        if (!publishGameName.IsValidPublishedGameName())
        {
            _logger.LogInformation($"publishGameName: {publishGameName} is not valid");
            return View("Error");
        }
        

        // VERSIONING
        var storagePublish = _storageConfig.ToUserStorage($"{author}-{publishGameName}");
        var publishProfile = storagePublish.GetSingleton<PublishProfile>()?.Result.GetObject();

        storagePublish.LogInformation($"game Index Called, gameName:{publishGameName}, author:{author}, gamePrimaryName:{gamePrimaryName}");

        if (publishProfile == null)
        {
            storagePublish.LogInformation("publishProfile not found");
            return View("Error");
        }

        var gameInstances = _gameContainer.ActiveGameInstances;

        var gameState = gameInstances
            .FirstOrDefault(i => 
                i.gameInstance.publishedGameName == publishGameName &&
                i.gameInstance.author == author &&
                i.gameInstance.version == publishProfile.version)
            ?.MapToGameState(_configuration);

        if (gameState == null)
        {
            storagePublish.LogInformation($"publishGameName: {publishGameName} live instance not found");
            return View("Error");
        }

        return View("Index", gameState);
    }
}