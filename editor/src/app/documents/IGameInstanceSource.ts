import { IGameConfig } from "./IGameConfig";
import { IGameInstance } from "./IGameInstance";

export interface IGameInstanceSource {
  feFiles: string[];
  gameConfig: IGameConfig;
  gameInstance: IGameInstance
}
