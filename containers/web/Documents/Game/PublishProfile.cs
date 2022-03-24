
public record PublishProfile(
    GameDefinition gameDefinition,
    string feRef,
    string beRef,
    string author,
    string version,
    DateTime publishDate,
    bool debugEnabled);
