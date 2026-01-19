export interface RegexDef {
  id: string;
  name?: string;
  pattern: string;
  replacement: string;
}

export interface Step {
  regexId?: string;
  groupRefId?: string;
  enabled?: boolean;
}

export interface Group {
  id: string;
  name: string;
  steps: Step[];
}

export interface Settings {
  groups: Group[];
  ungroupedSteps: Step[];
  activeGroupId?: string;
  regexLibrary: RegexDef[];
}

export interface RenameResult {
  success: boolean;
  oldName: string;
  newName?: string;
  error?: string;
}
