public record CompilationStatus(
    bool isComplete,
    bool containsErrors,
    string log
    );
