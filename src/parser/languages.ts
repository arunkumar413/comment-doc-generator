import * as path from "node:path";

export interface BlockCommentRule {
  start: string;
  end: string;
  lineStart?: boolean;
}

export interface StringRule {
  start: string;
  end: string;
  escapeChar?: string;
}

export interface LanguageProfile {
  fenceLanguage: string;
  blockComments: BlockCommentRule[];
  lineComments: string[];
  strings: StringRule[];
  isImportLine?: (line: string) => boolean;
}

const QUOTED_STRINGS: StringRule[] = [
  { start: '"', end: '"', escapeChar: "\\" },
  { start: "'", end: "'", escapeChar: "\\" }
];

const C_FAMILY_STRINGS: StringRule[] = [
  ...QUOTED_STRINGS,
  { start: "`", end: "`", escapeChar: "\\" }
];

export const C_FAMILY_PROFILE: LanguageProfile = {
  fenceLanguage: "c",
  blockComments: [{ start: "/*", end: "*/" }],
  lineComments: ["//"],
  strings: C_FAMILY_STRINGS
};

const SWIFT_PROFILE: LanguageProfile = {
  fenceLanguage: "swift",
  blockComments: [{ start: "/*", end: "*/" }],
  lineComments: ["//"],
  strings: [
    { start: '"""', end: '"""' },
    { start: '"', end: '"', escapeChar: "\\" }
  ],
  isImportLine: isImportStatement
};

const JAVASCRIPT_PROFILE: LanguageProfile = {
  ...C_FAMILY_PROFILE,
  fenceLanguage: "javascript",
  isImportLine: isImportStatement
};

const TYPESCRIPT_PROFILE: LanguageProfile = {
  ...JAVASCRIPT_PROFILE,
  fenceLanguage: "typescript"
};

const PYTHON_PROFILE: LanguageProfile = {
  fenceLanguage: "python",
  blockComments: [
    { start: '"""', end: '"""' },
    { start: "'''", end: "'''" }
  ],
  lineComments: ["#"],
  strings: QUOTED_STRINGS,
  isImportLine: (line) => {
    const trimmed = line.trimStart();
    return trimmed.startsWith("import ") || trimmed.startsWith("from ");
  }
};

const HTML_PROFILE: LanguageProfile = {
  fenceLanguage: "html",
  blockComments: [{ start: "<!--", end: "-->" }],
  lineComments: [],
  strings: QUOTED_STRINGS
};

const RUBY_PROFILE: LanguageProfile = {
  fenceLanguage: "ruby",
  blockComments: [{ start: "=begin", end: "=end", lineStart: true }],
  lineComments: ["#"],
  strings: QUOTED_STRINGS
};

const LUA_PROFILE: LanguageProfile = {
  fenceLanguage: "lua",
  blockComments: [{ start: "--[[", end: "]]" }],
  lineComments: ["--"],
  strings: QUOTED_STRINGS
};

const HASKELL_PROFILE: LanguageProfile = {
  fenceLanguage: "haskell",
  blockComments: [{ start: "{-", end: "-}" }],
  lineComments: ["--"],
  strings: QUOTED_STRINGS
};

const OCAML_PROFILE: LanguageProfile = {
  fenceLanguage: "ocaml",
  blockComments: [{ start: "(*", end: "*)" }],
  lineComments: [],
  strings: QUOTED_STRINGS
};

const PHP_PROFILE: LanguageProfile = {
  ...C_FAMILY_PROFILE,
  fenceLanguage: "php",
  lineComments: ["//", "#"]
};

const SQL_PROFILE: LanguageProfile = {
  fenceLanguage: "sql",
  blockComments: [{ start: "/*", end: "*/" }],
  lineComments: ["--"],
  strings: QUOTED_STRINGS
};

const CSS_PROFILE: LanguageProfile = {
  fenceLanguage: "css",
  blockComments: [{ start: "/*", end: "*/" }],
  lineComments: [],
  strings: QUOTED_STRINGS
};

const PROFILES_BY_EXTENSION: Record<string, LanguageProfile> = {
  ".c": { ...C_FAMILY_PROFILE, fenceLanguage: "c" },
  ".cc": { ...C_FAMILY_PROFILE, fenceLanguage: "cpp" },
  ".cpp": { ...C_FAMILY_PROFILE, fenceLanguage: "cpp" },
  ".cs": { ...C_FAMILY_PROFILE, fenceLanguage: "csharp" },
  ".css": CSS_PROFILE,
  ".cxx": { ...C_FAMILY_PROFILE, fenceLanguage: "cpp" },
  ".dart": { ...C_FAMILY_PROFILE, fenceLanguage: "dart" },
  ".go": { ...C_FAMILY_PROFILE, fenceLanguage: "go", isImportLine: isImportStatement },
  ".groovy": { ...C_FAMILY_PROFILE, fenceLanguage: "groovy" },
  ".h": { ...C_FAMILY_PROFILE, fenceLanguage: "c" },
  ".hpp": { ...C_FAMILY_PROFILE, fenceLanguage: "cpp" },
  ".hs": HASKELL_PROFILE,
  ".html": HTML_PROFILE,
  ".htm": HTML_PROFILE,
  ".java": { ...C_FAMILY_PROFILE, fenceLanguage: "java" },
  ".js": JAVASCRIPT_PROFILE,
  ".cjs": JAVASCRIPT_PROFILE,
  ".mjs": JAVASCRIPT_PROFILE,
  ".jsx": { ...JAVASCRIPT_PROFILE, fenceLanguage: "jsx" },
  ".kt": { ...C_FAMILY_PROFILE, fenceLanguage: "kotlin" },
  ".kts": { ...C_FAMILY_PROFILE, fenceLanguage: "kotlin" },
  ".less": CSS_PROFILE,
  ".lua": LUA_PROFILE,
  ".m": { ...C_FAMILY_PROFILE, fenceLanguage: "objectivec" },
  ".ml": OCAML_PROFILE,
  ".mli": OCAML_PROFILE,
  ".mm": { ...C_FAMILY_PROFILE, fenceLanguage: "objectivec" },
  ".php": PHP_PROFILE,
  ".py": PYTHON_PROFILE,
  ".rb": RUBY_PROFILE,
  ".rs": { ...C_FAMILY_PROFILE, fenceLanguage: "rust" },
  ".scala": { ...C_FAMILY_PROFILE, fenceLanguage: "scala" },
  ".scss": CSS_PROFILE,
  ".sql": SQL_PROFILE,
  ".swift": SWIFT_PROFILE,
  ".ts": TYPESCRIPT_PROFILE,
  ".tsx": { ...TYPESCRIPT_PROFILE, fenceLanguage: "tsx" },
  ".v": { ...C_FAMILY_PROFILE, fenceLanguage: "v", isImportLine: isImportStatement },
  ".vue": {
    ...HTML_PROFILE,
    fenceLanguage: "vue",
    blockComments: [...HTML_PROFILE.blockComments, ...C_FAMILY_PROFILE.blockComments],
    lineComments: ["//"]
  },
  ".vsh": { ...C_FAMILY_PROFILE, fenceLanguage: "v", isImportLine: isImportStatement },
  ".xml": { ...HTML_PROFILE, fenceLanguage: "xml" }
};

export function getLanguageProfile(filePath: string): LanguageProfile {
  const extension = path.extname(filePath).toLowerCase();
  const mapped = PROFILES_BY_EXTENSION[extension];

  if (mapped !== undefined) {
    return mapped;
  }

  return {
    ...C_FAMILY_PROFILE,
    fenceLanguage: extension.length > 1 ? extension.slice(1) : "text"
  };
}

export function isMarkdownPath(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".md";
}

function isImportStatement(line: string): boolean {
  return line.trimStart().startsWith("import ");
}
