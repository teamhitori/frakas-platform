export interface ICompilationStatus {
  isComplete: boolean;
  containsErrors: boolean;
  log: string;
  urlFE: string;
}
