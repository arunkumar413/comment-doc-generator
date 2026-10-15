import type { Document } from "../model/Document";
import type { Section } from "../model/Section";

export interface MarkdownWriterOptions {
  codeFenceLanguage?: string;
}

export class MarkdownWriter {
  public write(document: Document, options: MarkdownWriterOptions = {}): string {
    const language = options.codeFenceLanguage ?? "text";

    return document.sections
      .map((section) => renderSection(section, language))
      .filter((section) => section.length > 0)
      .join("\n\n")
      .trimEnd();
  }
}

function renderSection(section: Section, language: string): string {
  const parts: string[] = [];
  const markdown = section.markdown.trimEnd();
  const code = section.code.trimEnd();

  if (markdown.length > 0) {
    parts.push(markdown);
  }

  if (code.length > 0) {
    parts.push(["```" + language, code, "```"].join("\n"));
  }

  return parts.join("\n\n");
}
