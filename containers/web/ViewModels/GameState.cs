using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public record GameState
(
    IEnumerable<string> scriptFiles,
    IEnumerable<string> cssFiles,
    string assetsRoot,
    string gameName,
    string gamePrimaryName,
    string gameThumbnailUrl,
    bool fillScreen,
    double screenRatio,
    string wsUrl,
    string wsPort
);