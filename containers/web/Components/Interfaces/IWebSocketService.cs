
public interface IWebSocketService
{
    public IObservable<SocketConnectedDocument> OnMessage { get; }
    Task<bool> SendMessage(SocketConnectedDocument messageDoc, int retries = 3);
}