export interface RegexDef {
  id: string;
  name?: string;
  pattern: string;
  replacement: string;
  sample?: string;
  tags?: string[];
}

export interface NormalizationOptions {
  space: boolean;
  waveDash: boolean;
  dash: boolean;
  middleDot: boolean;
  brackets: boolean;
  colon: boolean;
  slash: boolean;
}

export interface Step {
  regexId?: string;
  groupRefId?: string;
  normalize?: boolean;
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
  normalization: NormalizationOptions;
}

export type RenameStep =
  | { type: 'regex'; pattern: string; replacement: string }
  | { type: 'normalize' }

export interface RenameResult {
  success: boolean;
  oldName: string;
  newName?: string;
  error?: string;
}
