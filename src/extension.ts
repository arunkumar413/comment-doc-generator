import * as vscode from "vscode";
import { GenerateMarkdownCommand } from "./commands/GenerateMarkdownCommand";
import { MarkdownWriter } from "./parser/MarkdownWriter";
import { DocumentationParser } from "./parser/DocumentationParser";
import { FileUtil } from "./util/FileUtil";

export function activate(context: vscode.ExtensionContext): void {
  const command = new GenerateMarkdownCommand(
    new DocumentationParser(),
    new MarkdownWriter(),
    new FileUtil()
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("commentDoc.generateMarkdown", (uri?: vscode.Uri) =>
      command.execute(uri)
    ),
    vscode.commands.registerCommand("commentDoc.generateMarkdownFromContext", (uri?: vscode.Uri) =>
      command.execute(uri)
    )
  );
}

export function deactivate(): void {
  // No resources to release.
}
