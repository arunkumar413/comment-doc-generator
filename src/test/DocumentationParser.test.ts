import { MarkdownWriter } from "../parser/MarkdownWriter";
import { DocumentationParser, DocumentationParserError } from "../parser/DocumentationParser";
import { getLanguageProfile, isMarkdownPath } from "../parser/languages";

describe("DocumentationParser", () => {
  const parser = new DocumentationParser();
  const swift = getLanguageProfile("Person.swift");

  it("returns no sections for an empty file", () => {
    expect(parser.parse("", { profile: swift })).toEqual({ sections: [] });
  });

  it("parses one documentation block with following code", () => {
    expect(
      parser.parse(
        `
/*
# Person

Represents a person.
*/

public struct Person {}
`,
        { profile: swift }
      )
    ).toEqual({
      sections: [
        {
          markdown: "# Person\n\nRepresents a person.",
          code: "public struct Person {}"
        }
      ]
    });
  });

  it("associates multiple documentation blocks with the code that follows each block", () => {
    const document = parser.parse(
      `
/*
# Button

Creates a button.
*/

public struct Button {

    /*
    ## Tap

    Called when tapped.
    */

    func tap() {

    }
}
`,
      { profile: swift }
    );

    expect(document.sections).toEqual([
      {
        markdown: "# Button\n\nCreates a button.",
        code: "public struct Button {"
      },
      {
        markdown: "## Tap\n\nCalled when tapped.",
        code: "func tap() {\n\n}\n}"
      }
    ]);
  });

  it("preserves nested braces in code blocks", () => {
    const document = parser.parse(
      `
/*
# Logic
*/
func run() {
    if true {
        print("yes")
    }
}
`,
      { profile: swift }
    );

    expect(document.sections[0]?.code).toBe(
      'func run() {\n    if true {\n        print("yes")\n    }\n}'
    );
  });

  it("trims blank lines around markdown and code", () => {
    const document = parser.parse(
      `
/*

# Title

*/


let value = 1

`,
      { profile: swift }
    );

    expect(document.sections[0]).toEqual({
      markdown: "# Title",
      code: "let value = 1"
    });
  });

  it("keeps UTF-8 content intact", () => {
    const document = parser.parse(
      `
/*
# Café

Uses emoji-free Unicode like naïve and 東京.
*/
struct Café {}
`,
      { profile: swift }
    );

    expect(document.sections[0]?.markdown).toContain("東京");
    expect(document.sections[0]?.code).toBe("struct Café {}");
  });

  it("dedents comments with indentation while preserving relative indentation", () => {
    const document = parser.parse(
      `
    /*
        # Indented

            let example = true
    */
    let value = 1
`,
      { profile: swift }
    );

    expect(document.sections[0]?.markdown).toBe("# Indented\n\n    let example = true");
    expect(document.sections[0]?.code).toBe("let value = 1");
  });

  it("supports comments immediately followed by EOF", () => {
    expect(parser.parse("/*\n# Done\n*/", { profile: swift })).toEqual({
      sections: [
        {
          markdown: "# Done",
          code: ""
        }
      ]
    });
  });

  it("ignores multiline comment markers inside strings", () => {
    const document = parser.parse(
      `
/*
# Pattern
*/
let pattern = "/* not documentation */"
let escaped = "quote: \\" and marker /* still string */"
let raw = """
/* also not documentation */
"""
`,
      { profile: swift }
    );

    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.code).toContain('let pattern = "/* not documentation */"');
    expect(document.sections[0]?.code).toContain(
      'let escaped = "quote: \\" and marker /* still string */"'
    );
    expect(document.sections[0]?.code).toContain("/* also not documentation */");
  });

  it("supports empty documentation blocks and empty code", () => {
    expect(parser.parse("/**/", { profile: swift })).toEqual({
      sections: [
        {
          markdown: "",
          code: ""
        }
      ]
    });
  });

  it("ignores multiline comment markers inside line comments", () => {
    const document = parser.parse(
      `
/*
# Pattern
*/
// /* not documentation */
let value = 1
`,
      { profile: swift }
    );

    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.code).toContain("// /* not documentation */");
  });

  it("can exclude import statements from code blocks", () => {
    const document = parser.parse(
      `
/*
# Person
*/
import Foundation
struct Person {}
`,
      { includeImports: false, profile: swift }
    );

    expect(document.sections[0]?.code).toBe("struct Person {}");
  });

  it("throws a parser error for unterminated multiline comments", () => {
    expect(() => parser.parse("/*\n# Broken", { profile: swift })).toThrow(
      DocumentationParserError
    );
  });

  it("uses C-style comments by default when no profile is provided", () => {
    expect(parser.parse("/*\n# Default\n*/\nconst value = 1;\n").sections[0]).toEqual({
      markdown: "# Default",
      code: "const value = 1;"
    });
  });

  it("parses JavaScript files using C-style comments and template literals", () => {
    const document = parser.parse(
      `
/*
# Add

Adds two numbers.
*/
export const add = (left, right) => left + right;
const ignored = \`/* not documentation */\`;
`,
      { profile: getLanguageProfile("math.js") }
    );

    expect(document.sections[0]?.markdown).toBe("# Add\n\nAdds two numbers.");
    expect(document.sections[0]?.code).toContain("export const add");
    expect(document.sections[0]?.code).toContain("/* not documentation */");
  });

  it("parses Python triple-quoted blocks as markdown comments", () => {
    const document = parser.parse(
      `
"""
# Person

Represents a person.
"""
from dataclasses import dataclass

@dataclass
class Person:
    name: str
`,
      { includeImports: false, profile: getLanguageProfile("person.py") }
    );

    expect(document.sections[0]?.markdown).toBe("# Person\n\nRepresents a person.");
    expect(document.sections[0]?.code).toBe("@dataclass\nclass Person:\n    name: str");
  });

  it("parses HTML comments", () => {
    const document = parser.parse(
      `<!--
# Page
-->
<main></main>
`,
      { profile: getLanguageProfile("index.html") }
    );

    expect(document.sections[0]).toEqual({
      markdown: "# Page",
      code: "<main></main>"
    });
  });

  it("parses Ruby =begin blocks only at line start", () => {
    const document = parser.parse(
      `
=begin
# Helper
=end
def helper
end
x = "=begin not a comment"
`,
      { profile: getLanguageProfile("helper.rb") }
    );

    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.markdown).toBe("# Helper");
    expect(document.sections[0]?.code).toContain("def helper");
    expect(document.sections[0]?.code).toContain("=begin not a comment");
  });

  it("parses Lua long comments with longest-token matching", () => {
    const document = parser.parse(
      `
--[[
# Work
]]
local work = true
-- [[ not a block
`,
      { profile: getLanguageProfile("work.lua") }
    );

    expect(document.sections[0]?.markdown).toBe("# Work");
    expect(document.sections[0]?.code).toContain("local work = true");
  });
});

describe("language profiles", () => {
  it("maps known extensions to fence languages", () => {
    expect(getLanguageProfile("a.ts").fenceLanguage).toBe("typescript");
    expect(getLanguageProfile("a.swift").fenceLanguage).toBe("swift");
    expect(getLanguageProfile("a.py").fenceLanguage).toBe("python");
    expect(getLanguageProfile("main.v").fenceLanguage).toBe("v");
    expect(getLanguageProfile("script.vsh").fenceLanguage).toBe("v");
  });

  it("falls back to C-style comments for unknown extensions", () => {
    const profile = getLanguageProfile("notes.unknownlang");
    expect(profile.blockComments[0]?.start).toBe("/*");
    expect(profile.fenceLanguage).toBe("unknownlang");
  });

  it("uses a text fence language when the path has no extension", () => {
    expect(getLanguageProfile("Makefile").fenceLanguage).toBe("text");
  });

  it("treats Markdown files as markdown paths", () => {
    expect(isMarkdownPath("Person.md")).toBe(true);
    expect(isMarkdownPath("Person.swift")).toBe(false);
  });
});

describe("MarkdownWriter", () => {
  it("renders markdown and code fences without trailing whitespace", () => {
    const writer = new MarkdownWriter();

    expect(
      writer.write(
        {
          sections: [
            {
              markdown: "# Person",
              code: "struct Person {}"
            },
            {
              markdown: "## Name",
              code: 'let name = "Ana"'
            }
          ]
        },
        { codeFenceLanguage: "swift" }
      )
    ).toBe(
      '# Person\n\n```swift\nstruct Person {}\n```\n\n## Name\n\n```swift\nlet name = "Ana"\n```'
    );
  });

  it("uses a custom code fence language", () => {
    const writer = new MarkdownWriter();

    expect(
      writer.write(
        {
          sections: [
            {
              markdown: "# Person",
              code: "struct Person {}"
            }
          ]
        },
        { codeFenceLanguage: "swift-example" }
      )
    ).toContain("```swift-example");
  });

  it("defaults the fence language and omits empty parts", () => {
    const writer = new MarkdownWriter();

    expect(writer.write({ sections: [{ markdown: "Notes", code: "" }] })).toBe("Notes");
    expect(writer.write({ sections: [{ markdown: "", code: "x = 1" }] })).toBe(
      "```text\nx = 1\n```"
    );
    expect(writer.write({ sections: [{ markdown: "", code: "" }] })).toBe("");
  });
});
