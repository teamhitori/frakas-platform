export interface IEditorCodeFile {
  gameName: string;
  fileName: string;
  code: string;
  isDirty: boolean;
  isValidSyntax: boolean;
  currentError: string;
  codeHash: number;
}
