import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import type { GeoJSONFeature, MapMouseEvent, SgMapInstance } from '~types/sgmap'

export interface UseMapClickOptions {
  /** 区分单击/双击的等待时间（毫秒），默认 500。 */
  delay?: number
  /** 是否用 `queryRenderedFeatures` 填充 `features`，默认 `false`。 */
  queryFeatures?: boolean
  /** 限定要素查询的图层。 */
  layers?: string[]
}

export interface MapClickEvent extends MapMouseEvent {
  /** 1 = 单击，2 = 双击 */
  clickType: 1 | 2
  features?: GeoJSONFeature[]
}

/**
 * 监听地图单击/双击，并通过 `clickType` 区分。
 *
 * 思极地图没有独立的双击事件，这里用延迟判定：第一次点击后等待 `delay`，
 * 期间出现第二次点击则视为双击，否则视为单击。
 *
 * @returns 手动停止监听的函数
 */
export function useMapClick(
  handler: (event: MapClickEvent) => void,
  options: UseMapClickOptions = {},
): () => void {
  const { delay = 500, queryFeatures = false, layers } = options
  const context = useMapContext()

  let timer: ReturnType<typeof setTimeout> | undefined
  let lastClickTime = 0
  let stopped = false
  let registeredMap: SgMapInstance | undefined

  const enrich = (event: MapMouseEvent, clickType: 1 | 2): MapClickEvent => {
    const result: MapClickEvent = { ...event, clickType }

    if (queryFeatures) {
      const map = context?.map.value
      if (map) {
        result.features = map.queryRenderedFeatures(
          [event.point.x, event.point.y],
          layers ? { layers } : undefined,
        )
      }
    }

    return result
  }

  const onClick = (event: MapMouseEvent) => {
    if (stopped) return

    const now = Date.now()

    if (timer !== undefined && now - lastClickTime <= delay) {
      clearTimeout(timer)
      timer = undefined
      lastClickTime = 0
      handler(enrich(event, 2))
      return
    }

    lastClickTime = now
    timer = setTimeout(() => {
      timer = undefined
      lastClickTime = 0
      if (stopped) return
      handler(enrich(event, 1))
    }, delay)
  }

  const stop = () => {
    if (stopped) return
    stopped = true

    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }

    const map = registeredMap
    registeredMap = undefined
    map?.off('click', onClick)
  }

  onMapReady(context, (map) => {
    if (stopped) return

    registeredMap = map
    map.on('click', onClick)

    return stop
  })

  return stop
}
