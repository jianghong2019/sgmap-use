/**
 * `unplugin-vue-components` 入口。
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import resolvers from 'sgmap-use/resolvers'
 * Components({ resolvers: [resolvers()] })
 * ```
 */
const components = new Set(['SgMap', 'Located'])

export interface SgMapComponentResolver {
  type: 'component'
  resolve: (name: string) => { name: string; from: string } | undefined
}

export default function resolvers(): SgMapComponentResolver {
  return {
    type: 'component',
    resolve: (name: string) => {
      if (!components.has(name)) return undefined
      return { name, from: 'sgmap-use' }
    },
  }
}
