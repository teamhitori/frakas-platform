
public record PublishProfile(
    GameDefinition gameDefinition,
    string author,
    string version,
    DateTime publishDate,
    bool debugEnabled);
