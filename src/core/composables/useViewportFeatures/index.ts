import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import type { Bounds } from '~shared/geo'
import type { FilterSpecification, GeoJSONFeature, SgMapInstance } from '~types/sgmap'
import { toBounds, type BoundsLike } from '~utils/toBounds'

/** 默认在这些事件之后刷新视口要素。 */
const DEFAULT_EVENTS = ['moveend', 'zoomend', 'idle']

export interface UseViewportFeaturesOptions {
  /** 只查询这些图层的要素。 */
  layers?: string[]
  /** 只查询满足条件的要素，使用 Mapbox 表达式。 */
  filter?: FilterSpecification
  /** 触发刷新的事件，默认 `['moveend', 'zoomend', 'idle']`。 */
  events?: string[]
  /** 地图就绪后是否立即查询一次，默认 `true`。 */
  immediate?: boolean
  /** 节流间隔（毫秒）；不传则用 requestAnimationFrame 合并高频事件。 */
  throttle?: number
}

export interface UseViewportFeaturesReturn {
  /** 当前视口内、可见图层中已渲染的要素。 */
  features: ShallowRef<GeoJSONFeature[]>
  /** 当前视口范围。 */
  bounds: Ref<Bounds | undefined>
  /** 立即重新查询。 */
  refresh: () => void
  /** 手动停止监听。 */
  stop: () => void
}

/**
 * 响应式获取当前视口内的要素。
 *
 * 默认在 `moveend` / `zoomend` / `idle` 后刷新；`idle` 能覆盖数据源变化、
 * 图标加载完成等情况。使用 `requestAnimationFrame` 合并高频事件。
 *
 * @example
 * ```ts
 * const { features, bounds, refresh } = useViewportFeatures({
 *   layers: ['stations'],
 *   filter: ['==', 'status', 'active'],
 * })
 * ```
 */
export function useViewportFeatures(
  options: UseViewportFeaturesOptions = {},
): UseViewportFeaturesReturn {
  const {
    layers,
    filter,
    events = DEFAULT_EVENTS,
    immediate = true,
    throttle,
  } = options

  const context = useMapContext()

  const features = shallowRef<GeoJSONFeature[]>([])
  const bounds = ref<Bounds>()

  let stopped = false
  let mapRef: SgMapInstance | undefined
  let frame: number | undefined
  let lastQuery = 0
  let handler: (() => void) | undefined

  const eventTypes = [...new Set(events)]

  const runQuery = (map: SgMapInstance) => {
    const queryOptions: { layers?: string[]; filter?: FilterSpecification } = {}

    if (layers?.length) queryOptions.layers = layers
    if (filter?.length) queryOptions.filter = filter

    features.value = map.queryRenderedFeatures(
      undefined,
      Object.keys(queryOptions).length ? queryOptions : undefined,
    )

    const rawBounds = map.getBounds?.()
    if (rawBounds === undefined) {
      bounds.value = undefined
      return
    }

    try {
      const [[west, south], [east, north]] = toBounds(rawBounds as BoundsLike)
      bounds.value = { west, south, east, north }
    } catch {
      bounds.value = undefined
    }
  }

  const schedule = (map: SgMapInstance) => {
    if (stopped) return

    if (throttle !== undefined) {
      const now = Date.now()
      if (now - lastQuery < throttle) return
      lastQuery = now
      runQuery(map)
      return
    }

    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = undefined
      if (!stopped) runQuery(map)
    })
  }

  const refresh = () => {
    if (!mapRef || stopped) return

    if (frame !== undefined) {
      cancelAnimationFrame(frame)
      frame = undefined
    }

    runQuery(mapRef)
  }

  const stop = () => {
    if (stopped) return
    stopped = true

    if (frame !== undefined) {
      cancelAnimationFrame(frame)
      frame = undefined
    }

    const map = mapRef
    mapRef = undefined

    if (map && handler) {
      for (const event of eventTypes) map.off(event, handler)
    }

    handler = undefined
  }

  onMapReady(context, (map) => {
    if (stopped) return

    mapRef = map
    handler = () => schedule(map)

    for (const event of eventTypes) map.on(event, handler)

    if (immediate) runQuery(map)

    return stop
  })

  return { features, bounds, refresh, stop }
}
