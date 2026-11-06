import type { Logger } from "@medusajs/framework/types"

/** Separators are optional. Lookarounds keep it from cutting longer numbers in two. */
const CPF_SHAPE = /(?<!\d)\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s/]?\d{2}(?!\d)/g

/**
 * The source quoted by a `JSON.parse` error, which body-parser passes on. It can be cut after the ninth
 * digit, so it does not look like a CPF, but the two check digits follow from the first nine.
 */
const QUOTED_JSON_SOURCE = /(?:\.\.\.)?"[\s\S]*"(?:\.\.\.)? is not valid JSON/g

export const REDACTED_CPF = "[redacted-cpf]"

/**
 * Replaces everything shaped like a CPF, valid or not, because a mistyped CPF is still personal data.
 * Other 11-digit numbers are replaced too, which is the safe side to err on. Kept free of workspace
 * imports because `medusa-config.ts` loads it, and `db:migrate` runs without building the packages.
 */
export function redactCpfInText(text: string): string {
  return text
    .replace(QUOTED_JSON_SOURCE, "[redacted-body] is not valid JSON")
    .replace(CPF_SHAPE, REDACTED_CPF)
}

export function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Copies strings, errors, arrays and plain objects. The caller's error keeps its real message. */
export function redactLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return redactCpfInText(value)
  }
  if (typeof value !== "object" || value === null) {
    return value
  }
  if (seen.has(value)) {
    return "[circular]"
  }
  seen.add(value)
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item, seen))
  }
  if (value instanceof Error) {
    const copy = new Error(redactCpfInText(value.message))
    copy.name = value.name
    copy.stack = value.stack && redactCpfInText(value.stack)
    copy.cause = redactLogValue(value.cause, seen)
    // body-parser errors keep the raw request in `body`.
    return Object.assign(copy, redactLogValue({ ...value }, seen))
  }
  if (!isPlainObject(value)) {
    return value
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactLogValue(item, seen)]),
  )
}

/**
 * Wraps Medusa's logger, keeping its levels and format. It sees what goes through the logger, not
 * `console` calls or the HTTP access log: for that one see `redactCpfInRequestLine`.
 */
export function redactingLogger(logger: Logger): Logger {
  return new Proxy(logger, {
    get(target, property) {
      const member: unknown = Reflect.get(target, property)
      if (typeof member !== "function") {
        return member
      }
      return (...args: unknown[]): unknown =>
        Reflect.apply(
          member,
          target,
          args.map((arg) => redactLogValue(arg)),
        )
    },
  })
}
