using Microsoft.AspNetCore.SignalR;
using TeamHitori.Mulplay.shared.storage;
using System.Reactive.Linq;

public class GameContainer
{
    public IEnumerable<GameInstanceSource> ActiveGameInstances { get { return _gameInstances.items; } }

    private Dictionary<string, bool> _compilerStarted = new Dictionary<string, bool>();
    private string _prevLogs;
    private IHubContext<GameHub, IGameClient> _hubContext { get; }
    //private GameService.GameServiceClient _grpcClient;
    private readonly Storage _storage;
    private readonly IStorageConfig _storageConfig;
    private readonly ILogger<GameContainer> _logger;
    private readonly IWebSocketService _webSocketService;
    //private IClientStreamWriter<ConnectedPlayerDocument> _playerEventRequestStream;
    private readonly IHttpService _httpService;

    private Dictionary<string, string> _connections = new Dictionary<string, string>();
    private Dictionary<string, Tuple<string, string>> _monitorGame = new Dictionary<string, Tuple<string, string>>();
    private Dictionary<string, string> _monitorsInstance = new Dictionary<string, string>();
    private Dictionary<string, string> _monitorActivePlayers = new Dictionary<string, string>();
    private GameInstances _gameInstances = new GameInstances(new List<GameInstanceSource>());

    public GameContainer(
        IHubContext<GameHub, IGameClient> hubContext,
        ILogger<GameContainer> logger,
        //GameService.GameServiceClient grpcClient,
        IWebSocketService webSocketService,
        IStorageConfig storageConfig,
        IHttpService httpService)
    {
        _hubContext = hubContext;
        _logger = logger;
        //_grpcClient = grpcClient;
        this._httpService = httpService;
        _storageConfig = storageConfig;
        _webSocketService = webSocketService;
        _storage = storageConfig.ToUserStorage($"TeamHitori.Mulplay.Container.Web.Components.GameContainer");
        _logger.LogInformation("Game Container Called");

        StartWebsocketReceive();

    }

    public async Task CreateGame(GameInstanceSource gameInstanceSource)
    {
        try
        {
            await _httpService.UrlGetType<object>($"http://game/create-game/{ gameInstanceSource.gameInstance.gamePrimaryName }/{ gameInstanceSource.beRef }", 0);

            var metricsConnected = await _webSocketService.SendMessage(new SocketConnectedDocument(Topic.metrics, null, gameInstanceSource.gameInstance.gamePrimaryName));

            if (metricsConnected)
            {
                var items = _gameInstances.items.Upsert(gameInstanceSource, inst => inst.gameInstance.gamePrimaryName == gameInstanceSource.gameInstance.gamePrimaryName);

                _gameInstances = new GameInstances(items);

                await _storage.Upsert(_gameInstances, true);
            }

        }
        catch (Exception e)
        {
            _logger.LogError(e.Message);
            throw;
        }
    }



    public async Task DestroyGame(string gamePrimaryName)
    {
        try
        {
            var items = _gameInstances.items.Upsert(null, inst => inst.gameInstance.gamePrimaryName == gamePrimaryName);

            _gameInstances = new GameInstances(items);

            await _httpService.UrlGetType<object>($"http://game/destroy-game/{ gamePrimaryName }", 0);

            await _webSocketService.SendMessage(new SocketConnectedDocument(Topic.destroyGame, null, gamePrimaryName));

        }
        catch (Exception e)
        {

            _logger.LogError(e.Message);
        }

    }

    public async Task NotifyReload(string userId, string gameName)
    {
        foreach (var user in _monitorGame)
        {
            if (user.Key == userId && user.Value.Item1 == gameName)
            {
                await _hubContext.Clients.Client(user.Value.Item2).OnNotifyReload();
            }
        }
    }

    public void StartCompile(string userId, string userName, string gameName, string bodyStr)
    {
        var storage = _storageConfig.ToUserStorage(userId);

        var gameLocation = $"debug:{ userName }:{ gameName }";

        if (_compilerStarted.TryGetValue(gameLocation, out var compilerStarted))
        {
            if (compilerStarted)
            {
                _logger.LogInformation($"Compile { gameLocation } already started");
            }
        }
        new Task(async () =>
        {
            try
            {
                _compilerStarted[gameLocation] = true;

                await _httpService.UrlPostType<object>($"http://build/set/{ userName }/{ gameName}", bodyStr, 0);

                while (_compilerStarted[gameLocation])
                {

                    var status = await _httpService.UrlGetType<CompilationStatus>($"http://build/poll/{ userName }/{ gameName }", 0);

                    if (status == null)
                    {
                        throw new Exception($"build appears to be down: http://build/poll/{ userName }/{ gameName }");
                    }

                    await UpsertAndNotifyCompilation(storage, userName, gameName, status);


                    if (status?.isComplete == true)
                    {
                        _compilerStarted[gameLocation] = false;

                        await storage.Upsert(status.log, false, $"{gameName}-prevLogs");

                        await storage.Upsert(status.urlFE, false, $"{gameName}:{CodeType.FrontendLogic}");
                        await storage.Upsert($"{userName.ToLower()}-{gameName.ToLower()}-be", false, $"{gameName}:{CodeType.BackendLogic}");

                        await NotifyCompilation(userName, gameName, status);
                    }
                    else
                    {
                        await Task.Delay(1000);
                    }
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e.Message);
            }
        }).Start();
    }

    private async Task UpsertAndNotifyCompilation(Storage storage, string userName, string gameName, CompilationStatus status)
    {
        if (_prevLogs != status.log)
        {


            await NotifyCompilation(userName, gameName, status);
        }


        _prevLogs = status.log;
    }

    private async Task NotifyCompilation(string userName, string gameName, CompilationStatus status)
    {
        foreach (var user in _monitorGame)
        {
            if (user.Key == userName && user.Value.Item1 == gameName)
            {
                await _hubContext.Clients.Client(user.Value.Item2).OnNotifyCompilation(status);
            }
        }
    }

    private void StartWebsocketReceive()
    {
        try
        {
            _webSocketService.OnMessage
                .Subscribe(async message =>
                {
                    _logger.LogInformation($"Websocket msg: {message.topic} ");

                    if (message.topic == Topic.metrics)
                    {
                        foreach (var user in _monitorsInstance)
                        {
                            if (user.Value == message.gamePrimaryName)
                            {
                                await _hubContext.Clients.Client(user.Key).OnMetrics(message.content);
                            }
                        }
                    }
                });
        }
        catch (Exception e)
        {
            _logger.LogError(e.Message);
        }
    }

    public void MontorGame(string connectionId, string gameName, string userName)
    {
        _monitorGame[userName] = Tuple.Create(gameName.ToLower(), connectionId);
    }

    public void MonitorActivePlayers(string connectionId, string gameLocation)
    {
        _monitorActivePlayers[connectionId] = gameLocation;
    }

    public void MonitorInstance(string connectionId, string gamePrimaryName)
    {
        _monitorsInstance[connectionId] = gamePrimaryName;
    }



    //public int GetActiveConnectionCount(string gamePrimaryName)
    //{
    //    return _connections.Count(pair => pair.Value == gamePrimaryName);
    //}

    //public async Task EnableDebug(string gameName, Boolean enable)
    //{
    //    var existingInstance = _gameInstances.items.FirstOrDefault(i => i.gameName.StartsWith(gameName));
    //    if (existingInstance != null)
    //    {
    //        var items = _gameInstances.items.Upsert(existingInstance with { isDebug = enable }, i => i.gameName.StartsWith(gameName));

    //        _gameInstances = new GameInstances(items);

    //        await _storage.Upsert(_gameInstances, true);
    //    }
    //}

    //private void NotifyActivePlayerCount(string gamePrimaryName)
    //{
    //    var game = _gameInstances.items.FirstOrDefault(i => i.gamePrimaryName == gamePrimaryName);

    //    if (game != null)
    //    {
    //        var activeInstances = _gameInstances.items.Where(inst => inst.gameName.StartsWith(game.gameName));
    //        var activePlayers = activeInstances.Aggregate(0, (count, inst) => GetActiveConnectionCount(inst.gamePrimaryName) + count);

    //        foreach (var conn in _monitorActivePlayers)
    //        {
    //            if (game.gameName.StartsWith(conn.Value))
    //            {
    //                //_ = _hubContext.Clients.Client(conn.Key).OnActivePlayerChange(activePlayers);
    //            }

    //        }
    //    }

    //}

}
