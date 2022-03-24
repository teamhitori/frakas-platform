export interface IDebugDef{
  gameName: String;
  runMode: RunMode
}

export enum RunMode {
  Default,
  Step
}
