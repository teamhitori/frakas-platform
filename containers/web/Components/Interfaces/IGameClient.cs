
public interface IGameClient
{
    Task onPlayerEvent(string content);
    Task OnPlayerExitState(string content);
    Task OnGameState(string content);
    Task OnMetrics(string content);
    Task OnGameEnd(string content);
    Task OnStep(string content);
    Task OnNotifyReload();
    Task OnNotifyCompilation(CompilationStatus status);
    Task OnNotifyPublishedGameEvent();
    Task OnActivePlayerChange(int count);
}