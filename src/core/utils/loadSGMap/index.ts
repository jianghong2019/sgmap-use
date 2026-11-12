import { sgmapError, throwError } from '~shared/errorHandler'
import { resetSGMapLib, setSGMapLib } from '~shared/sdk'
import type { SGMapNamespace } from '~types/sgmap'

export const DEFAULT_SG_MAP_SRC = 'https://map.sgcc.com.cn/maps?v=3.0.0'

const SCRIPT_ID = 'sgmap-use-sdk'

export interface LoadSGMapOptions {
  /** SDK 脚本地址，默认 `https://map.sgcc.com.cn/maps?v=3.0.0`。 */
  src?: string
  /** 思极地图 appkey，与 `appsecret` 同时提供时执行登录。 */
  appkey?: string
  /** 思极地图 appsecret。 */
  appsecret?: string
  /** 需要预加载的插件，如 `['SGMap.DistrictPlusTask']`。 */
  plugins?: string[]
}

let loading: Promise<SGMapNamespace> | undefined

/**
 * 加载思极地图 SDK（幂等）。
 *
 * 依次完成：脚本注入 → 认证登录 → 插件加载，并把命名空间登记到模块单例。
 *
 * 注意：首次调用决定 `src` / `appkey` / `plugins`，后续调用直接复用已完成的 Promise。
 * 若需要在同一页面使用不同认证信息，请在首次调用时传入完整参数。
 *
 * @example
 * ```ts
 * const SGMap = await loadSGMap({ appkey: 'xxx', appsecret: 'xxx' })
 * const map = new SGMap.Map({ container: 'map', center: [116.39, 39.9], zoom: 11 })
 * ```
 */
export function loadSGMap(options: LoadSGMapOptions = {}): Promise<SGMapNamespace> {
  if (loading) return loading

  loading = bootstrap(options).catch((reason: unknown) => {
    loading = undefined
    throw reason
  })

  return loading
}

/** 重置加载状态（仅用于测试或热重载）。 */
export function resetLoadSGMap(): void {
  loading = undefined
  resetSGMapLib()
}

async function bootstrap(options: LoadSGMapOptions): Promise<SGMapNamespace> {
  const lib = window.SGMap ?? (await injectScript(options.src ?? DEFAULT_SG_MAP_SRC))

  setSGMapLib(lib)

  if (options.appkey && options.appsecret) {
    const tokenTask = lib.tokenTask
    if (!tokenTask?.login) {
      throwError('SGMap.tokenTask.login is unavailable')
    }
    await tokenTask.login(options.appkey, options.appsecret)
  }

  if (options.plugins?.length) {
    const plugin = lib.plugin
    if (!plugin) {
      throwError('SGMap.plugin is unavailable')
    }
    await plugin(options.plugins)
  }

  return lib
}

function injectScript(src: string): Promise<SGMapNamespace> {
  return new Promise<SGMapNamespace>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(sgmapError('document is not available, cannot load SGMap SDK'))
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')

    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    function onLoad() {
      cleanup()
      if (!window.SGMap) {
        reject(sgmapError('SGMap SDK loaded but window.SGMap is undefined'))
        return
      }
      resolve(window.SGMap)
    }

    function onError() {
      cleanup()
      // 移除失败的脚本，避免重试时复用已触发 error 的元素而永久挂起。
      if (!existing) script.remove()
      reject(sgmapError(`failed to load SGMap SDK from ${src}`))
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)

    if (existing) {
      if (window.SGMap) onLoad()
      return
    }

    script.id = SCRIPT_ID
    script.src = src
    script.async = true
    document.head.appendChild(script)
  })
}
