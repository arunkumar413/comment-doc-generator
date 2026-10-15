# Comment Markdown Documentation Generator

Generate Markdown documentation from multiline comments directly inside Visual Studio Code.

If you're learning a language and want to create notes or a tutorial for your library, this is for you.

Put Markdown content in a multiline comment, right-click in the file editor, and choose **Generate Markdown Documentation**. It creates a Markdown file next to the source, so you don't have to switch between the source file and a notes file.

## Features

- Explorer context menu for source files: **Generate Markdown Documentation**
- Editor context menu for source files: **Generate Markdown Documentation**
- Command Palette command: **Comment Docs: Generate Markdown**
- Generates `FileName.md` next to `FileName.swift`, `FileName.py`, and other source files by default
- Infers the Markdown code fence language from the file extension
- Optional overwrite, output folder, import inclusion, generated file opening, and code fence language settings

## How It Works

The extension scans the source character by character and treats every multiline comment block as Markdown. Comment syntax depends on the file type:

| Languages                                                                                     | Multiline comment              |
| --------------------------------------------------------------------------------------------- | ------------------------------ |
| Swift, JavaScript, TypeScript, Java, Kotlin, Go, Rust, C, C++, C#, CSS, PHP, SQL, and similar | `/* ... */`                    |
| Python                                                                                        | `""" ... """` or `''' ... '''` |
| HTML, XML                                                                                     | `<!-- ... -->`                 |
| Ruby                                                                                          | `=begin ... =end`              |
| Lua                                                                                           | `--[[ ... ]]`                  |
| Haskell                                                                                       | `{- ... -}`                    |
| OCaml                                                                                         | `(* ... *)`                    |

Unknown extensions use `/* ... */`.

```swift
/*
# Button

Creates a button.
*/

public struct Button {}
```

Generates:

````markdown
# Button

Creates a button.

```swift
public struct Button {}
```
````

Each documentation block owns the source code that follows it until the next documentation block or the end of the file. Markers inside strings and line comments are ignored.

## Settings

| Setting                        | Default | Description                                                                              |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| `commentDoc.outputFolder`      | `""`    | Optional output folder. Empty writes next to the source file.                            |
| `commentDoc.overwrite`         | `false` | Overwrite existing Markdown without confirmation.                                        |
| `commentDoc.openAfterGenerate` | `true`  | Open the generated Markdown file after generation.                                       |
| `commentDoc.includeImports`    | `true`  | Include import statements in generated code fences when the language supports them.      |
| `commentDoc.codeFenceLanguage` | `""`    | Language identifier for Markdown code fences. Empty infers it from the source extension. |

## Development

```bash
npm install
npm run compile
npm test
npm run lint
```

Package for the Marketplace:

```bash
npm run package
```

`npm run package` will create a `.vsix` extension package.

1. Go to VS Code
2. Click on the Extensions icon
3. Select `Install from VSIX` and select the packaged `.vsix` file to install the extension.

## Examples

See `examples/Person.swift` and `examples/Person.md`.
