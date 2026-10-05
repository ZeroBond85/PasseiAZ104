/**
 * ts-resolve.mjs — shim de resolucao para rodar .mts/.ts sem tsx.
 *
 * Contexto: `node_modules` foi instalado no WSL (@esbuild/linux-x64), mas o node
 * disponivel aqui e o do Windows, que exige @esbuild/win32-x64. Instalar a
 * plataforma correta do caminho UNC estoura a stack do npm, entao o contorno e
 * rodar os .mts com o strip-types nativo do Node >= 22 (que le .ts sem
 * esbuild) mais um hook que mapeia o `.js` relativo do import de TS para o
 * `.ts` real em disco.
 *
 * Uso:
 *   node --experimental-strip-types --import ./scripts/ts-resolve.mjs \
 *        scripts/validate-questions.mts
 *
 * Nao substitui `npm run validate` no CI (la o node e linux e o tsx funciona).
 * Este shim existe so para o loop local no Windows sobre o repositorio WSL.
 */
import { register } from 'node:module'

/**
 * Existe em disco? Hooks de resolucao sao sincronos, entao so da para usar a
 * versao sync. `fileURLToPath` handles os prefixes file:// do Windows/UNC.
 */
const HOOK = `
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REL = /^\\.{1,2}\\//

export function resolve(specifier, context, next) {
  if (REL.test(specifier) && /\\.js$/.test(specifier) && context.parentURL) {
    const abs = fileURLToPath(new URL(specifier, context.parentURL))
    // so troca quando o .js nao existe E o .ts existe. Confiar em try/catch
    // nao funciona aqui: uma vez que next() falhou para o .js, a segunda
    // tentativa volta a falhar, e trocar cegamente quebraria o zod v4, que
    // tem "./v4/classic/external.js" legitimo em disco.
    if (!existsSync(abs)) {
      for (const ext of ['.ts', '.mts']) {
        if (existsSync(abs.slice(0, -3) + ext)) {
          return next(specifier.slice(0, -3) + ext, context)
        }
      }
    }
  }
  return next(specifier, context)
}
`

register(`data:text/javascript,${encodeURIComponent(HOOK)}`, import.meta.url)
