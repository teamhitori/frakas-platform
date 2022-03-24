
public record SocketConnectedDocument(
        Topic topic,
        string connectionId = null,
        string gamePrimaryName = null,
        string content = null

        );


public enum Topic
{
    ping,
    createGame,
    startGame,
    restartGame,
    metrics,
    destroyGame,
    playerEnter,
    playerExit,
    playerEventIn,
    playerEventOut,
    gameLoop,
    gameEnd
}