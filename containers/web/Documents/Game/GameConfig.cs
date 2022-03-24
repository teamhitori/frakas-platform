
public record GameConfig(
    string gameName,
    bool fillScreen = false,
    double screenRatio = 16 / 9,
    IEnumerable<string> codeFileNames = null
    );
