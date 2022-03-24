using Microsoft.AspNetCore.Mvc;
using TeamHitori.Mulplay.shared.storage;
using Microsoft.AspNetCore.Authorization;

[Authorize]
public class EditorController : Controller
{

    private readonly ILogger<EditorApiController> _logger;
    private readonly GameContainer _gameContainer;
    private readonly IStorageConfig _storageConfig;


    public EditorController(
        ILogger<EditorApiController> logger,
        GameContainer gameContainer,
        IStorageConfig storageConfig
        )
    {
        _logger = logger;
        _gameContainer = gameContainer;
        this._storageConfig = storageConfig;
    }


    [HttpGet("editor/{publishedGameName?}")]
    public async Task<IActionResult> Index(string publishedGameName)
    {
        if (User.Identity.IsAuthenticated)
        {
            // To lower

            _logger.LogInformation($"editor/{publishedGameName}");

            ViewBag.publishedGameName = publishedGameName;
            return View("Editor"); //return RedirectToAction("Index", "Editor", new { gameName = gameName });
        }
        else
        {
            return Redirect("/MicrosoftIdentity/Account/SignIn");
        }
    }

    [HttpGet("editor-frame")]
    public async Task<IActionResult> Frame()
    {
        return View("Frame");
    }
}
