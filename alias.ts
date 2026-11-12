import { fileURLToPath } from 'node:url'

function resolveAlias(aliasMap: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(aliasMap).map(([key, value]) => [
      key,
      fileURLToPath(new URL(value, import.meta.url)),
    ]),
  )
}

/**
 * 路径别名，供 `vite.config.ts` 与 `tsconfig.json` 共用同一套键。
 * 注意：更具体的别名必须放在 `~` 之前，避免前缀匹配错误。
 */
export default resolveAlias({
  '~components': './src/core/components',
  '~composables': './src/core/composables',
  '~utils': './src/core/utils',
  '~shared': './src/shared',
  '~types': './src/types',
  '~': './src',
})
