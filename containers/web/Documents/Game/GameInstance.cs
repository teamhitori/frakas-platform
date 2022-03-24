
public record GameInstance
    (
        string gameName,
        string publishedGameName,
        string gamePrimaryName,
        string author,
        string version,
        string createTime,
        bool isDebug,
        bool isStarted,
        bool isMetricsActive
    );
