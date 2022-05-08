namespace web.Components
{
    public static class MappingExtensions
    {
        public static GameState MapToGameState(this GameInstanceSource source, IConfiguration configuration)
        {
            var thumbnailUrl = string.IsNullOrEmpty(source.gameConfig.gameThumbnail) ? 
                $"{configuration["static_url"]}assets/img/logo.png" : 
                $"{configuration["Azure:Blob:Endpoint"]}/{source.gameInstance.author.ToLower()}-{source.gameInstance.publishedGameName.ToLower()}/assets/{source.gameConfig.gameThumbnail}";

            return new GameState(
                source.feFiles
                    .Where(f => f == "node.bundle.main.js")
                    .Select(f => $"{configuration["Azure:Blob:Endpoint"]}/{source.gameInstance.author.ToLower()}-{source.gameInstance.publishedGameName.ToLower()}/{f}"),
                source.feFiles
                    .Where(f => f.EndsWith("css"))
                    .Select(f => $"{configuration["Azure:Blob:Endpoint"]}/{source.gameInstance.author.ToLower()}-{source.gameInstance.publishedGameName.ToLower()}/{f}"),
                $"{configuration["Azure:Blob:Endpoint"]}/{source.gameInstance.author.ToLower()}-{source.gameInstance.publishedGameName.ToLower()}/assets/",
                source.gameInstance.gameName,
                source.gameInstance.gamePrimaryName,
                thumbnailUrl,
                source.gameConfig.fillScreen,
                source.gameConfig.screenRatio,
                configuration["ws_url"],
                configuration["ws_port"]);
        }
    }
}
