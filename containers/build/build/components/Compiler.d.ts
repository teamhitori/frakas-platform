import { CompilationStatus } from '../documents/CompilationStatus';
import { AzStorage } from './AzStorage';
export declare class Compiler {
    private _userName;
    private _gameName;
    private _isBuildComplete;
    private _containsErrors;
    private _log;
    private _compiledSource;
    private _urlFE;
    _azStorage: AzStorage;
    private _tsc;
    constructor(_userName: string, _gameName: string);
    isStarted(): boolean;
    private _npm;
    private _spawntsc;
    private start;
    logs(): string;
    poll(): CompilationStatus;
    set(sourceFiles: {
        [name: string]: string;
    }): Promise<void>;
}
//# sourceMappingURL=Compiler.d.ts.map