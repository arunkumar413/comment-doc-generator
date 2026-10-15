# Changelog

## 0.2.0

- Renamed the extension to Comment Markdown Documentation Generator (`comment-doc-generator`).
- Generate Markdown from multiline comments in any source file, not only Swift.
- Infer code fence languages from file extensions and recognize common comment syntaxes.
- Replaced `swiftDoc.*` commands and settings with `commentDoc.*`.

## 0.1.0

- Initial release.
- Added Swift multiline comment parser.
- Added Markdown writer and VS Code command integration.
- Added settings for output folder, overwrite behavior, generated file opening, import inclusion, and code fence language.
- Added Jest parser and writer tests.
