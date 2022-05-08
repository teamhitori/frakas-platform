
public record PublishedDefinition
    (
        Boolean isPublished,
        string publishedPath,
        Boolean isStarted,
        int activePlayerCount,
        string version
    );

public static class PublishedDefinitionExtensions
{

    public static PublishedDefinition GetLatest(GameDefinition gameDefinition, GameContainer gameContainer, string userName)
    {

        var activeInstances = gameContainer.ActiveGameInstances.Where(inst => inst.gameInstance.gameName == gameDefinition.gameName &&
            inst.gameInstance.author == userName);
        return new PublishedDefinition(
            gameDefinition.isPublished,
            $"/{userName}/{gameDefinition.publishedGameName}",
            activeInstances.Any(),
            0, //activeInstances.Aggregate(0, (count, inst) => gameContainer.GetActiveConnectionCount(inst.gamePrimaryName) + count),
            gameDefinition.version
            );
    }
}