using TeamHitori.Mulplay.shared.storage;

public static class SessionExtensions
{
    public static string? GetUserName(this System.Security.Claims.ClaimsPrincipal user)
    {
        return user.Identity?.Name?.ToLower() ?? user.Claims.FirstOrDefault(c => c.Type == "name")?.Value;
    }

    public static void SetObj<T>(this ISession session, string primaryName, T objIn) where T : class
    {
        var typeName = typeof(T).Name;
        var doc = objIn.ToJDoc();

        session.SetString($"{typeName}:{primaryName}", doc.content);
    }

    public static T GetObj<T>(this ISession session, string primaryName) where T : class
    {
        var typeName = typeof(T).Name;
        var contents = session.GetString($"{typeName}:{primaryName}");

        var res = contents.GetObject<T>();

        return res;
    }

    public static IEnumerable<T> GetAllOfType<T>(this ISession session) where T : class
    {
        var typeName = typeof(T).Name;
        foreach (var key in session.Keys)
        {
            if (key.StartsWith($"{typeName}:"))
            {
                var contents = session.GetString(key);
                var res = contents.GetObject<T>();

                yield return res;
            }
        }
    }
}