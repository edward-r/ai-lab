import yargsParser from 'yargs-parser'

type PositionalOptions = {
  default?: unknown
}

type Builder = {
  positional: (name: string, opts: PositionalOptions) => Builder
}

const BOOLEAN_OPTIONS = [
  'interactive',
  'copy',
  'open-chatgpt',
  'polish',
  'json',
  'progress',
  'smart-context',
  'help',
]

const ARRAY_OPTIONS = ['context', 'image', 'video']

const DEFAULTS: Record<string, unknown> = {
  context: [],
  image: [],
  video: [],
  progress: true,
}

const ALIASES: Record<string, string> = {
  c: 'context',
  f: 'intent-file',
  i: 'interactive',
  h: 'help',
}

const createYargs = (argv: string[]) => {
  const positionalDefaults: Record<string, unknown> = {}
  let failHandler: ((msg?: string, err?: Error) => void) | undefined

  const api: any = {
    scriptName: () => api,
    usage: () => api,
    option: () => api,
    alias: () => api,
    help: () => api,
    exitProcess: () => api,
    showHelpOnFail: () => api,
    parserConfiguration: () => api,
    strict: () => api,
    command(_pattern: string, _desc: string, builder?: (cmd: Builder) => Builder) {
      if (builder) {
        builder({
          positional(name, opts) {
            if (opts && Object.prototype.hasOwnProperty.call(opts, 'default')) {
              positionalDefaults[name] = opts.default
            }
            return this
          },
        } as Builder)
      }
      return api
    },
    fail(handler: (msg?: string, err?: Error) => void) {
      failHandler = handler
      return api
    },
    showHelp: () => undefined,
    parseSync() {
      try {
        const parsed = yargsParser(argv, {
          alias: ALIASES,
          array: ARRAY_OPTIONS,
          boolean: BOOLEAN_OPTIONS,
          configuration: {
            'halt-at-non-option': true,
            'camel-case-expansion': true,
          },
          default: DEFAULTS,
        }) as Record<string, unknown>

        for (const [name, value] of Object.entries(positionalDefaults)) {
          if (parsed[name] === undefined || parsed[name] === '') {
            parsed[name] = value
          }
        }

        return parsed
      } catch (error) {
        failHandler?.((error as Error).message, error as Error)
        throw error
      }
    },
  }

  return api
}

const yargs = (argv: string[]) => createYargs(argv)

export type ArgumentsCamelCase<T> = T

export default yargs
