import * as path from "node:path";
import * as vscode from "vscode";
import type { FileUtil } from "../util/FileUtil";
import type { MarkdownWriter } from "../parser/MarkdownWriter";
import { type DocumentationParser, DocumentationParserError } from "../parser/DocumentationParser";
import { getLanguageProfile } from "../parser/languages";

interface CommentDocConfiguration {
  outputFolder: string;
  overwrite: boolean;
  openAfterGenerate: boolean;
  includeImports: boolean;
  codeFenceLanguage: string;
}

export class GenerateMarkdownCommand {
  public constructor(
    private readonly parser: DocumentationParser,
    private readonly writer: MarkdownWriter,
    private readonly fileUtil: FileUtil
  ) {}

  public async execute(selectedUri?: vscode.Uri): Promise<void> {
    const sourceUri = selectedUri ?? vscode.window.activeTextEditor?.document.uri;

    if (sourceUri === undefined || !this.fileUtil.isSupportedSourceFile(sourceUri)) {
      await vscode.window.showErrorMessage(
        "Select a source file (not Markdown) before generating docs."
      );
      return;
    }

    const configuration = this.getConfiguration(sourceUri);
    const profile = getLanguageProfile(sourceUri.fsPath);
    const outputUri = this.fileUtil.getMarkdownUri(
      sourceUri,
      this.resolveOutputFolder(sourceUri, configuration.outputFolder)
    );

    try {
      if (
        (await this.fileUtil.exists(outputUri)) &&
        !(await this.canOverwrite(outputUri, configuration))
      ) {
        return;
      }

      const source = await this.fileUtil.readText(sourceUri);
      const document = this.parser.parse(source, {
        includeImports: configuration.includeImports,
        profile
      });

      if (document.sections.length === 0) {
        await vscode.window.showWarningMessage("No multiline documentation blocks were found.");
        return;
      }

      const markdown = this.writer.write(document, {
        codeFenceLanguage:
          configuration.codeFenceLanguage.trim().length > 0
            ? configuration.codeFenceLanguage
            : profile.fenceLanguage
      });

      await this.fileUtil.writeText(outputUri, markdown);
      await vscode.window.showInformationMessage(`Generated ${path.basename(outputUri.fsPath)}.`);

      if (configuration.openAfterGenerate) {
        const generatedDocument = await vscode.workspace.openTextDocument(outputUri);
        await vscode.window.showTextDocument(generatedDocument);
      }
    } catch (error: unknown) {
      await vscode.window.showErrorMessage(this.formatError(error));
    }
  }

  private getConfiguration(sourceUri: vscode.Uri): CommentDocConfiguration {
    const configuration = vscode.workspace.getConfiguration("commentDoc", sourceUri);

    return {
      outputFolder: configuration.get("outputFolder", ""),
      overwrite: configuration.get("overwrite", false),
      openAfterGenerate: configuration.get("openAfterGenerate", true),
      includeImports: configuration.get("includeImports", true),
      codeFenceLanguage: configuration.get("codeFenceLanguage", "")
    };
  }

  private resolveOutputFolder(sourceUri: vscode.Uri, outputFolder: string): string {
    if (outputFolder.trim().length === 0 || path.isAbsolute(outputFolder)) {
      return outputFolder;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
    const basePath = workspaceFolder?.uri.fsPath ?? path.dirname(sourceUri.fsPath);

    return path.join(basePath, outputFolder);
  }

  private async canOverwrite(
    outputUri: vscode.Uri,
    configuration: CommentDocConfiguration
  ): Promise<boolean> {
    if (configuration.overwrite) {
      return true;
    }

    const answer = await vscode.window.showWarningMessage(
      `${path.basename(outputUri.fsPath)} already exists. Overwrite it?`,
      { modal: true },
      "Overwrite"
    );

    return answer === "Overwrite";
  }

  private formatError(error: unknown): string {
    if (error instanceof DocumentationParserError) {
      return `Documentation parser error: ${error.message}`;
    }

    if (error instanceof Error) {
      return `Failed to generate documentation: ${error.message}`;
    }

    return "Failed to generate documentation.";
  }
}
