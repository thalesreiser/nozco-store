// Works on the file text, because a colour can sit in a template, a script or a <style> block.

const NAMED = "white|black|red|green|blue|yellow|orange|purple|pink|gr[ae]y|silver|brown"
const TAILWIND_PALETTE = `${NAMED}|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose`
const COLOUR_UTILITY =
  "bg|text|border(?:-[xytrbl]|-[se])?|ring|ring-offset|fill|stroke|from|via|to|outline|decoration|divide|placeholder|caret|accent|shadow|inset-shadow|inset-ring"

const PATTERNS = [
  // In-page links such as href="#cafe" are not colours.
  /(?<![\w&/]|(?:href|to)=["'])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi,
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi,
  new RegExp(
    `(?<![\\w-])(?:${COLOUR_UTILITY})-(?:${TAILWIND_PALETTE})(?:-\\d{2,3})?(?![\\w-])`,
    "g",
  ),
  new RegExp(
    `\\b(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke)\\s*[:=]\\s*["']?[^;"'\\n]*?\\b(?:${NAMED})\\b`,
    "gi",
  ),
]

/** Every raw colour in `text`, as `{ index, value }`, in order of appearance. */
export function findRawColours(text) {
  return PATTERNS.flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => ({ index: match.index, value: match[0] })),
  ).sort((a, b) => a.index - b.index)
}

/** @type {import("eslint").Rule.RuleModule} */
export const noRawColors = {
  meta: {
    type: "problem",
    docs: { description: "Ban raw colours outside app/assets/css/tokens.css" },
    schema: [],
    messages: { raw: 'Raw colour "{{value}}". Use a semantic token from tokens.css.' },
  },
  create(context) {
    const { sourceCode } = context
    return {
      Program() {
        // "see #123" in a script comment is not a colour.
        const comments = sourceCode.getAllComments()
        for (const { index, value } of findRawColours(sourceCode.text)) {
          if (comments.some(({ range }) => index >= range[0] && index < range[1])) continue
          context.report({
            loc: sourceCode.getLocFromIndex(index),
            messageId: "raw",
            data: { value },
          })
        }
      },
    }
  },
}
