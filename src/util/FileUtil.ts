import * as path from "node:path";
import * as vscode from "vscode";
import { isMarkdownPath } from "../parser/languages";

export class FileUtil {
  public isSupportedSourceFile(uri: vscode.Uri): boolean {
    return !isMarkdownPath(uri.fsPath);
  }

  public getMarkdownUri(sourceUri: vscode.Uri, outputFolder: string): vscode.Uri {
    const parsedPath = path.parse(sourceUri.fsPath);
    const outputDirectory = outputFolder.trim().length > 0 ? outputFolder : parsedPath.dir;
    const targetPath = path.join(outputDirectory, `${parsedPath.name}.md`);

    return vscode.Uri.file(targetPath);
  }

  public async exists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  public async readText(uri: vscode.Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString("utf8");
  }

  public async writeText(uri: vscode.Uri, content: string): Promise<void> {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(uri.fsPath)));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
  }
}
