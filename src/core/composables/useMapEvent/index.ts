import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import type { MapEventListener, SgMapInstance } from '~types/sgmap'

export interface UseMapEventOptions {
  /** 指定图层 id 时，仅在命中该图层要素时触发。 */
  layerId?: string
  /** 是否只监听一次。 */
  once?: boolean
}

/**
 * 监听地图事件，并在作用域销毁时自动 `map.off`。
 *
 * @example
 * ```ts
 * useMapEvent('click', (event) => console.log(event.lngLat))
 * useMapEvent('mouseenter', onEnter, { layerId: 'stations' })
 * ```
 *
 * @returns 手动停止监听的函数
 */
export function useMapEvent(
  type: string,
  listener: MapEventListener,
  options: UseMapEventOptions = {},
): () => void {
  const context = useMapContext()

  let active = true
  let registered: SgMapInstance | undefined

  const stop = () => {
    if (!active) return
    active = false

    if (!registered) return
    const map = registered
    registered = undefined

    if (options.layerId) map.off(type, options.layerId, listener)
    else map.off(type, listener)
  }

  onMapReady(context, (map) => {
    if (!active) return

    registered = map

    if (options.layerId) {
      if (options.once) map.once(type, options.layerId, listener)
      else map.on(type, options.layerId, listener)
    } else if (options.once) {
      map.once(type, listener)
    } else {
      map.on(type, listener)
    }

    return stop
  })

  return stop
}
