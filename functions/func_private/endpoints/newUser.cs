using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using func_private.documents;
using Microsoft.Extensions.Configuration;
using TeamHitori.Mulplay.shared.storage.documents;
using System.Reflection;
using System.Linq;
using shared.Documents;
using TeamHitori.Mulplay.shared.storage;
using System.Collections.Generic;

namespace func_private
{
    public static class newUser
    {
        static IEnumerable<string> _badNameList = new List<string>() {
            "editor",
            "game",
            "dojo",
            "build",
            "user",
            "default",
            "defaults",
            "null"
        };

        [FunctionName("new-user-create")]
        public static async Task<IActionResult> RunNew(
            [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req,
            ILogger log,
            ExecutionContext context)
        {
            var response = new ContinuationResponse()
            {
                version = "1.0.0",
                action = "Continue"
            };

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);

            log.LogInformation($"new-user content: {requestBody}");

            return new OkObjectResult(response);
        }

        [FunctionName("new-user-validate")]
        public static async Task<IActionResult> RunValidate(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req,
        ILogger log,
        ExecutionContext context)
        {

            var response = new ContinuationResponse()
            {
                version = "1.0.0",
                action = "Continue"
            };

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);

            log.LogInformation($"new-user content: {requestBody}");

            var config = new ConfigurationBuilder()
                 .SetBasePath(context.FunctionAppDirectory)
                 .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
                 .AddUserSecrets(Assembly.GetExecutingAssembly(), true)
                 .AddEnvironmentVariables()
                 .Build();

            var storageConfig = StorageExtensions.CreateStorage(config, log);

            var users = await storageConfig.DBRepository.RawQuery<UserDocument>("SELECT DISTINCT c.userPrincipleId FROM c where c.type = \"UserProfile\"");

            var exists = users
                .Select(doc => doc.GetUserDocument<UserProfile>().GetObject())
                .Any(user => user.userName.ToLower() == $"{data.displayName}".ToLower());

            if (exists)
            {
                response = new ContinuationResponse()
                {
                    version = "1.0.0",
                    status = "400",
                    action = "ValidationError",
                    userMessage = $"Username {data.displayName} is already taken"
                };

                return new BadRequestObjectResult(response);
            }

            var banned = _badNameList
                .Any(name => name.ToLower() == $"{data.displayName}".ToLower());


            if (banned)
            {
                response = new ContinuationResponse()
                {
                    version = "1.0.0",
                    status = "400",
                    action = "ValidationError",
                    userMessage = $"Username {data.displayName} cannot be used"
                };

                return new BadRequestObjectResult(response);
            }


            return new OkObjectResult(response);

        }
    }
}
