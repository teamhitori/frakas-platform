using System;

public class Disposable : IDisposable
{
    private readonly Action onDispose;

    public Disposable(Action onDispose)
    {
        this.onDispose = onDispose;
    }

    public void Dispose()
    {
        onDispose();
    }
}
