import type { Document } from "../model/Document";
import type { Section } from "../model/Section";
import {
  C_FAMILY_PROFILE,
  type BlockCommentRule,
  type LanguageProfile,
  type StringRule
} from "./languages";

export interface DocumentationParserOptions {
  includeImports?: boolean;
  profile?: LanguageProfile;
}

type ScannerState = "Normal" | "InsideMultilineComment" | "EndComment";

interface ActiveString {
  rule: StringRule;
  escaped: boolean;
}

export class DocumentationParserError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DocumentationParserError";
  }
}

export class DocumentationParser {
  public parse(source: string, options: DocumentationParserOptions = {}): Document {
    const profile = options.profile ?? C_FAMILY_PROFILE;
    const sections: Section[] = [];
    let state: ScannerState = "Normal";
    let codeBuffer = "";
    let commentBuffer = "";
    let pendingMarkdown: string | undefined;
    let activeBlockEnd: string | undefined;
    let activeString: ActiveString | undefined;
    let insideLineComment = false;
    const includeImports = options.includeImports ?? true;

    for (let index = 0; index < source.length; index += 1) {
      const current = source.charAt(index);

      if (state === "InsideMultilineComment") {
        if (activeBlockEnd !== undefined && tokenAt(source, index, activeBlockEnd)) {
          state = "EndComment";
          index += activeBlockEnd.length - 1;
          pendingMarkdown = normalizeComment(commentBuffer);
          commentBuffer = "";
          activeBlockEnd = undefined;
          continue;
        }

        commentBuffer += current;
        continue;
      }

      if (state === "EndComment") {
        state = "Normal";
      }

      if (insideLineComment) {
        codeBuffer += current;
        if (current === "\n") {
          insideLineComment = false;
        }
        continue;
      }

      if (activeString !== undefined) {
        const consumed = consumeString(source, index, activeString, codeBuffer);
        codeBuffer = consumed.codeBuffer;
        activeString = consumed.activeString;
        index += consumed.advance;
        continue;
      }

      const match = matchToken(source, index, profile);

      if (match?.kind === "block") {
        if (pendingMarkdown !== undefined) {
          sections.push({
            markdown: pendingMarkdown,
            code: normalizeCode(codeBuffer, includeImports, profile)
          });
        }

        pendingMarkdown = undefined;
        codeBuffer = "";
        state = "InsideMultilineComment";
        activeBlockEnd = match.rule.end;
        index += match.rule.start.length - 1;
        continue;
      }

      if (match?.kind === "line") {
        insideLineComment = true;
        codeBuffer += current;
        continue;
      }

      if (match?.kind === "string") {
        activeString = { rule: match.rule, escaped: false };
        codeBuffer += match.rule.start;
        index += match.rule.start.length - 1;
        continue;
      }

      if (pendingMarkdown !== undefined) {
        codeBuffer += current;
      }
    }

    if (state === "InsideMultilineComment") {
      throw new DocumentationParserError("Unterminated multiline comment.");
    }

    if (pendingMarkdown !== undefined) {
      sections.push({
        markdown: pendingMarkdown,
        code: normalizeCode(codeBuffer, includeImports, profile)
      });
    }

    return { sections };
  }
}

interface TokenMatch {
  kind: "block" | "line" | "string";
  length: number;
  rule?: BlockCommentRule | StringRule;
}

function matchToken(
  source: string,
  index: number,
  profile: LanguageProfile
):
  | { kind: "block"; rule: BlockCommentRule }
  | { kind: "line"; token: string }
  | { kind: "string"; rule: StringRule }
  | undefined {
  const candidates: TokenMatch[] = [];

  for (const rule of profile.blockComments) {
    if (rule.lineStart === true && !isLineStart(source, index)) {
      continue;
    }

    if (tokenAt(source, index, rule.start)) {
      candidates.push({ kind: "block", length: rule.start.length, rule });
    }
  }

  for (const token of profile.lineComments) {
    if (tokenAt(source, index, token)) {
      candidates.push({ kind: "line", length: token.length });
    }
  }

  for (const rule of profile.strings) {
    if (tokenAt(source, index, rule.start)) {
      candidates.push({ kind: "string", length: rule.start.length, rule });
    }
  }

  if (candidates.length === 0) {
    return undefined;
  }

  candidates.sort((left, right) => right.length - left.length);
  const winner = candidates[0] as TokenMatch;

  if (winner.kind === "block") {
    return { kind: "block", rule: winner.rule as BlockCommentRule };
  }

  if (winner.kind === "string") {
    return { kind: "string", rule: winner.rule as StringRule };
  }

  return { kind: "line", token: source.slice(index, index + winner.length) };
}

function consumeString(
  source: string,
  index: number,
  activeString: ActiveString,
  codeBuffer: string
): { codeBuffer: string; activeString: ActiveString | undefined; advance: number } {
  const { rule, escaped } = activeString;

  if (!escaped && tokenAt(source, index, rule.end)) {
    return {
      codeBuffer: codeBuffer + rule.end,
      activeString: undefined,
      advance: rule.end.length - 1
    };
  }

  const current = source.charAt(index);
  const nextBuffer = codeBuffer + current;

  if (escaped) {
    return { codeBuffer: nextBuffer, activeString: { rule, escaped: false }, advance: 0 };
  }

  if (rule.escapeChar !== undefined && current === rule.escapeChar) {
    return { codeBuffer: nextBuffer, activeString: { rule, escaped: true }, advance: 0 };
  }

  return { codeBuffer: nextBuffer, activeString, advance: 0 };
}

function tokenAt(source: string, index: number, token: string): boolean {
  return token.length > 0 && source.startsWith(token, index);
}

function isLineStart(source: string, index: number): boolean {
  return index === 0 || source.charAt(index - 1) === "\n";
}

function normalizeComment(comment: string): string {
  return removeCommonIndent(trimBlankLines(comment));
}

function normalizeCode(code: string, includeImports: boolean, profile: LanguageProfile): string {
  const trimmed = trimBlankLines(code);
  const withoutImports =
    includeImports || profile.isImportLine === undefined
      ? trimmed
      : trimmed
          .split(/\r?\n/u)
          .filter((line) => !profile.isImportLine?.(line))
          .join("\n");

  return removeIndentFromFirstLine(trimBlankLines(withoutImports)).trimEnd();
}

function trimBlankLines(value: string): string {
  const normalized = value.replace(/\r\n?/gu, "\n");
  const lines = normalized.split("\n");

  while (lines.length > 0 && isBlank(lines[0] as string)) {
    lines.shift();
  }

  while (lines.length > 0 && isBlank(lines[lines.length - 1] as string)) {
    lines.pop();
  }

  return lines.join("\n");
}

function removeCommonIndent(value: string): string {
  const lines = value.split("\n");
  const indents = lines
    .filter((line) => !isBlank(line))
    .map((line) => leadingWhitespace(line).length);
  const indent = indents.length > 0 ? Math.min(...indents) : 0;

  if (indent === 0) {
    return value.trimEnd();
  }

  return lines
    .map((line) => (line.length >= indent ? line.slice(indent) : line))
    .join("\n")
    .trimEnd();
}

function removeIndentFromFirstLine(value: string): string {
  const lines = value.split("\n");
  const firstCodeLine = lines.find((line) => !isBlank(line));
  const indent = firstCodeLine === undefined ? "" : leadingWhitespace(firstCodeLine);

  if (indent.length === 0) {
    return value;
  }

  return lines
    .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
    .join("\n");
}

function leadingWhitespace(value: string): string {
  const match = /^[\t ]*/u.exec(value);
  return match === null ? "" : match[0];
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
