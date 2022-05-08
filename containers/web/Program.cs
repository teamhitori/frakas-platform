using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.WebEncoders;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;
using StackExchange.Redis;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using TeamHitori.Mulplay.shared.storage;

var builder = WebApplication.CreateBuilder(args);

var configuration = builder.Configuration;

// Add services to the container.


var azureSignalrConnectionString = configuration["Azure:SignalR:ConnectionString"];



builder.Services.AddHttpClient<IHttpService, HttpService>()
     .SetHandlerLifetime(TimeSpan.FromMinutes(5));

builder.Services.AddSingleton(serviceProvider =>
    {
        var storageConfig = serviceProvider.GetRequiredService<IStorageConfig>();
        var storage = storageConfig.ToUserStorage($"TeamHitori.Mulplay.Container.Web.Components.GameContainer");
        var hubContext =  serviceProvider.GetRequiredService<IHubContext<GameHub, IGameClient>>();
        var logger = serviceProvider.GetRequiredService<ILogger<GameContainer>>();
        var httpService = serviceProvider.GetRequiredService<IHttpService>();
        //var grpcClient = serviceProvider.GetRequiredService<GameService.GameServiceClient>();
        // var websocketService = serviceProvider.GetRequiredService<IWebSocketService>();

        var gameContainer = new GameContainer(hubContext, logger, storageConfig, httpService);

        var doc = storage.GetSingleton<GameInstances>().Result;
        var wrapper = doc?.GetObject();
        var instances = wrapper
            ?.items
            ?.Where(i => !i.gameInstance.gameName.StartsWith("debug:"));
        instances?.Foreach(async i =>
        {
            var publishName = string.Join(":", i.gameInstance.gameName.Split(":").Take(2));
            var storagePublish = storageConfig.ToUserStorage(publishName);
            var publishProfile = storagePublish.GetSingleton<PublishProfile>()?.Result.GetObject();

            await gameContainer.CreateGame(i with { gameInstance = i.gameInstance with { isStarted = false, isMetricsActive = false } });
        });

        return gameContainer;
    });

builder.Services.AddSingleton(x =>
    {
        var ikey = configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];

        var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder
                .AddApplicationInsights(ikey)
                .AddFilter("Microsoft", LogLevel.Warning)
                .AddFilter("System", LogLevel.Warning)
                .AddFilter("LoggingConsoleApp.Program", LogLevel.Debug)
                     .AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>
                          ("", LogLevel.Trace)
                     .AddConsole();
        });

        var logger = loggerFactory.CreateLogger("main");

        return logger;
    });

//builder.Services.AddSingleton<IWebSocketService, WebSocketService>();

builder.Services.AddSingleton(col =>
{
    var logger = col.GetRequiredService<ILogger>();
    var blobConnectionString = configuration["Azure:Blob:ConnectionString"];
    var containerName = configuration["Azure:Blob:ContainerName"];
    var cacheConnectionString = configuration["Azure:Redis:ConnectionString"];
    var endpoint = configuration["Azure:Cosmos:Endpoint"];
    var key = configuration["Azure:Cosmos:Key"];
    var databaseId = configuration["Azure:Cosmos:DatabaseId"];
    var collectionId = configuration["Azure:Cosmos:CollectionId"];
    var cache = string.IsNullOrEmpty(cacheConnectionString) ? null : ConnectionMultiplexer.Connect(cacheConnectionString).GetDatabase();

    return StorageExtensions.CreateStorage(blobConnectionString, endpoint, key, databaseId, collectionId, logger, cache);
});

builder.Services.AddSignalR()
    .AddAzureSignalR(options =>
    {
        options.ConnectionString = azureSignalrConnectionString;
    });

// The following line enables Application Insights telemetry collection.
builder.Services.AddApplicationInsightsTelemetry();


// Adds Microsoft Identity platform (AAD v2.0) support to protect this Api
builder.Services.AddDistributedMemoryCache();

builder.Services.AddSession(options =>
{
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.IsEssential = true;
});

builder.Services.Configure<CookiePolicyOptions>(options =>
{
    // This lambda determines whether user consent for non-essential cookies is needed for a given request.
    options.CheckConsentNeeded = context => true;
    options.MinimumSameSitePolicy = SameSiteMode.Unspecified;
    // Handling SameSite cookie according to https://docs.microsoft.com/en-us/aspnet/core/security/samesite?view=aspnetcore-3.1
    options.HandleSameSiteCookieCompatibility();
});

builder.Services.AddMicrosoftIdentityWebApiAuthentication(configuration, "AzureAdB2C");

builder.Services.AddAuthentication(o =>
    {
        o.RequireAuthenticatedSignIn = true;
        o.DefaultSignInScheme = OpenIdConnectDefaults.AuthenticationScheme;
        o.DefaultAuthenticateScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddMicrosoftIdentityWebApp(configuration.GetSection("AzureAdB2C"));



builder.Services.AddAuthorization(options =>
{
    // By default, all incoming requests will be authorized according to 
    // the default policy
    options.FallbackPolicy = options.DefaultPolicy;
});

builder.Services.AddControllersWithViews()
    .AddMicrosoftIdentityUI();

builder.Services.AddRazorPages();

builder.Services.Configure<WebEncoderOptions>(options =>
{
    options.TextEncoderSettings = new TextEncoderSettings(UnicodeRanges.All);
});


var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

// app.UseHttpsRedirection();
app.UseStaticFiles();

app.Use(async (context, next) =>
{
    var scheme = context.Request.Scheme;
    if (scheme == "http")
    {
        context.Request.Scheme = "https";
        //logger.LogInformation($"Middleware upgrade request: {context.Request.Scheme}://{context.Request.Host}");
    }

    // Call the next delegate/middleware in the pipeline
    await next();
});

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.UseSession();



app.UseEndpoints(endpoints =>
    {
        endpoints.MapHub<GameHub>("/game");

        endpoints.MapControllerRoute(
            name: "editor",
            pattern: "editor/{gameName?}",
            defaults: new { controller = "editor", action = "Index" });

        endpoints.MapControllerRoute(
            name: "publishGameName",
            pattern: "{publishGameName?}",
            defaults: new { controller = "game", action = "Index" });

        endpoints.MapRazorPages();
    });


app.Run();
