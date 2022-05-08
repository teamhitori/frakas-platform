
public record GameInstanceSource(
     IEnumerable<string> feFiles,
     GameConfig gameConfig,
     GameInstance gameInstance
     );