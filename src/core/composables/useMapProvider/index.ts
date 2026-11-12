import {
  getCurrentScope,
  onMounted,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue'
import { sgmapError } from '~shared/errorHandler'
import type { SgMapInstance } from '~types/sgmap'

export interface MapContext {
  /** 地图实例，使用 `shallowRef` 避免深度响应式代理。 */
  map: ShallowRef<SgMapInstance | undefined>
  /** 地图 `load` 是否完成。 */
  isLoaded: Ref<boolean>
  /** 地图 `load` 完成后 resolve 出实例。 */
  ready: Promise<SgMapInstance>
}

export const MAP_CONTEXT_KEY: InjectionKey<MapContext> = Symbol('sgmap-use:map')

export interface UseMapProviderOptions {
  /**
   * 是否等待地图 `load` 后再把 `isLoaded` 置为 true，默认 `true`。
   * 置为 `false` 时实例创建完成即视为就绪（图层相关能力可能尚不可用）。
   */
  waitForLoad?: boolean
}

/**
 * 在祖先组件中创建并提供地图实例。
 *
 * @example
 * ```ts
 * useMapProvider(async () => {
 *   const SGMap = await loadSGMap({ appkey, appsecret })
 *   return new SGMap.Map({ container: 'map', center: [116.39, 39.9], zoom: 11 })
 * })
 * ```
 */
export function useMapProvider(
  init: () => SgMapInstance | Promise<SgMapInstance>,
  options: UseMapProviderOptions = {},
): MapContext {
  const { waitForLoad = true } = options

  const map = shallowRef<SgMapInstance>()
  const isLoaded = ref(false)

  let resolveReady!: (instance: SgMapInstance) => void
  let rejectReady!: (reason: unknown) => void

  const ready = new Promise<SgMapInstance>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  // 避免没有消费者 await 时产生 unhandled rejection 警告。
  ready.catch(() => {})

  let disposed = false

  onScopeDispose(() => {
    disposed = true
  })

  onMounted(async () => {
    try {
      const instance = await init()

      if (disposed) {
        instance.remove?.()
        rejectReady(sgmapError('map provider was disposed before initialization completed'))
        return
      }

      map.value = instance

      if (waitForLoad) await waitForMapLoad(instance)

      isLoaded.value = true
      resolveReady(instance)
    } catch (reason) {
      rejectReady(reason)
    }
  })

  const context: MapContext = { map, isLoaded, ready }
  provide(MAP_CONTEXT_KEY, context)

  return context
}

/** 等待地图样式加载完成；已加载时立即返回。 */
export function waitForMapLoad(map: SgMapInstance): Promise<void> {
  if (map.isStyleLoaded?.() || map.loaded?.()) return Promise.resolve()

  return new Promise<void>((resolve) => {
    map.once('load', () => resolve())
  })
}

/**
 * 在地图就绪时执行回调，返回的清理函数会在作用域销毁时自动执行。
 * 已就绪则同步执行；未就绪则等待 `isLoaded` 变为 true，且只执行一次。
 */
export function onMapReady(
  context: MapContext | undefined,
  callback: (map: SgMapInstance) => void | (() => void),
): void {
  if (!context) return

  let cleanup: void | (() => void)
  let stopWatch: (() => void) | undefined

  const run = (map: SgMapInstance) => {
    cleanup = callback(map)
  }

  if (context.map.value && context.isLoaded.value) {
    run(context.map.value)
  } else {
    stopWatch = watch(
      context.isLoaded,
      (loaded) => {
        if (!loaded || !context.map.value) return
        stopWatch?.()
        stopWatch = undefined
        run(context.map.value)
      },
      { immediate: true },
    )
  }

  if (!getCurrentScope()) return

  onScopeDispose(() => {
    stopWatch?.()
    stopWatch = undefined
    cleanup?.()
  })
}
