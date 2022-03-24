using TeamHitori.Mulplay.shared.storage;

public record GameDefinition(
       string gameName,
       string publishedGameName,
       string storageRoot,
       IEnumerable<CodeFile> codeFiles,
       GameConfig gameConfig,
       bool isPublished,
       string publishedPath,
       string eSaSToken,
       string version,
       bool debugEnabled,
       string prevLogs
       );


public static class GameDefinitionExtensions
{
    public async static Task<string> GetFECode(this Storage storage, string gameName)
    {
        var frontEndCodeDoc = await storage.FindDocumentByPrimaryName<string>($"{gameName}:{CodeType.FrontendLogic}");
        var frontEndCode = frontEndCodeDoc.GetObject().DoIfNull(() =>
        {
            //var code = new CompiledCode(gameName, CodeType.FrontendLogic, "");
            _ = storage.Upsert("", primaryNameIN: $"{gameName}:{CodeType.FrontendLogic}");
            return "";
        });
        return frontEndCode;
    }

    public async static Task<string> GetBECode(this Storage storage, string gameName)
    {
        var backendCodeDoc = await storage.FindDocumentByPrimaryName<string>($"{gameName}:{CodeType.BackendLogic}");
        var backendCode = backendCodeDoc.GetObject().DoIfNull(() =>
        {
            //var code = new CompiledCode(gameName, CodeType.BackendLogic, "");
            _ = storage.Upsert("", primaryNameIN: $"{gameName}:{CodeType.BackendLogic}");
            return "";
        });

        return backendCode;
    }


    public async static Task<GameDefinition> GetLatest(Storage storage, Storage storagePublish, string publishedGameName, string gameName = null)
    {
        var gameConfigDoc = await storage.FindDocumentByPrimaryName<GameConfig>(publishedGameName);
        var gameConfig = gameConfigDoc.GetObject();

        if (gameConfig == null)
        {

            storage.LogInformation($"GetLatest {publishedGameName} GameConfig does not exist, creating new with name { gameName ?? publishedGameName }");
            gameConfig = new GameConfig(gameName ?? publishedGameName);
            await storage.Upsert(gameConfig, primaryNameIN: publishedGameName);
        }

        var codeFiles = gameConfig.codeFileNames?.Select(async fileName =>
        {
            var codeDoc = await storage.FindDocumentByPrimaryName<CodeFile>($"{publishedGameName}:{fileName}");
            return codeDoc.GetObject().DoIfNull(() =>
            {
                var logic = new CodeFile(publishedGameName, fileName, "");
                _ = storage.Upsert(logic, primaryNameIN: $"{publishedGameName}:{CodeType.FrontendLogic}");
                return logic;
            });
        }).Select(t => t.Result).ToList();

        var prevLogsDoc = await storage.FindDocumentByPrimaryName<string>($"{gameName}-prevLogs");
        var prevLogs = prevLogsDoc.GetObject() ?? "";

        codeFiles ??= new List<CodeFile>();

        var publishProfileDoc = await storagePublish.GetSingleton<PublishProfile>();
        var publishProfile = publishProfileDoc?.GetObject();
        var publishedGameUrl = publishProfile == null ? string.Empty : $"/{publishProfile.author}/{publishedGameName}";

        var eSaSToken = storagePublish.GetSasToken(Azure.Storage.Sas.BlobSasPermissions.All);

        return new GameDefinition(
            gameConfig.gameName,
            publishedGameName,
            storagePublish.UserId,
            codeFiles,
            gameConfig,
            publishProfileDoc != null,
            publishedGameUrl,
            eSaSToken,
            publishProfile?.version,
            publishProfile?.debugEnabled ?? false,
            prevLogs
            );
    }
}