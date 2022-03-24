import { IGameConfig } from "./IGameConfig";
import { IGameInstance } from "./IGameInstance";

export interface IGameInstanceSource {
  feRef: string;
  beRef: string;
  gameConfig: IGameConfig;
  gameInstance: IGameInstance
}
