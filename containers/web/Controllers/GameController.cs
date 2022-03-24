using Microsoft.AspNetCore.Mvc;
using TeamHitori.Mulplay.shared.storage;
using Microsoft.AspNetCore.Authorization;

[AllowAnonymous]
public class GameController : Controller
{

    private readonly ILogger<EditorApiController> _logger;
    private readonly GameContainer _gameContainer;
    private readonly IStorageConfig _storageConfig;

    public GameController(
        ILogger<EditorApiController> logger,
        GameContainer gameContainer,
        IStorageConfig storageConfig
        )

    {
        _logger = logger;
        _gameContainer = gameContainer;
        this._storageConfig = storageConfig;
    }

    [HttpGet("{publishedGameName?}")]
    public async Task<IActionResult> Index(string publishedGameName, [FromQuery(Name = "gamePrimaryName")] string gamePrimaryName)
    {
        if (User.Identity.IsAuthenticated)
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

            var gameDefinition = await GameDefinitionExtensions.GetLatest(storage, storagePublish, publishedGameName);

            if (gameDefinition == null)
            {
                throw new Exception($"Cannot find game {publishedGameName}");
            }

            var feRef = await storage.GetFECode(publishedGameName);
            var beRef = await storage.GetBECode(publishedGameName);

            var gameInstances = _gameContainer.ActiveGameInstances;

            if (string.IsNullOrEmpty(gamePrimaryName))
            {
                var gameInstance = new GameInstance(gameDefinition.gameName, gameDefinition.publishedGameName, gamePrimaryName, userName, "0.0.0.0", DateTime.Now.ToString("yyyy/MM/dd HH:mm:ssZ"), false, false, false);
                var activeInstance = new GameInstanceSource(feRef, beRef, gameDefinition.gameConfig, gameInstance);

                return View("Index", activeInstance);

            }
            else
            {
                var activeInstance = gameInstances.FirstOrDefault(i =>
                i.gameInstance.gameName == gameDefinition.gameName &&
                i.gameInstance.gamePrimaryName == gamePrimaryName);

                return View("Index", activeInstance);
            }

        }
        else
        {
            return Redirect("/MicrosoftIdentity/Account/SignIn");
        }
    }

    [HttpGet("{author}/{gameName}")]
    public async Task<IActionResult> Index(string gameName, string author, [FromQuery(Name = "gamePrimaryName")] bool? gamePrimaryName)
    {
        // TO LOWER
        author = (author ?? String.Empty).ToLower();

        var publishGameName = gameName.ToLower().Replace(" ", "-");

        // VERSIONING
        var storagePublish = _storageConfig.ToUserStorage($"{author}-{publishGameName}");
        var publishProfile = storagePublish.GetSingleton<PublishProfile>()?.Result.GetObject();

        storagePublish.LogInformation($"game Index Called, gameName:{gameName}, author:{author}, gamePrimaryName:{gamePrimaryName}");

        if (publishProfile == null)
        {
            storagePublish.LogInformation("publishProfile not found");
            return View("Index", null);
        }

        var gameInstances = _gameContainer.ActiveGameInstances;


        var activeInstance = gameInstances.FirstOrDefault(i => i.gameInstance.gameName == gameName &&
            i.gameInstance.author == author &&
            i.gameInstance.version == publishProfile.version);

        return View("Index", activeInstance);
    }
}