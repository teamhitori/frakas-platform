import { ICodeFile } from "./ICodeFile";
import { IGameConfig } from "./IGameConfig";

export interface IGameDefinition {
  gameName: string;
  publishedGameName: string;
  storageRoot: string;
  codeFiles: ICodeFile[],
  gameConfig: IGameConfig;
  isPublished: boolean;
  publishedPath: string;
  eSaSToken: string;
  version: string;
  debugEnabled: boolean;
  prevLogs: string
}
