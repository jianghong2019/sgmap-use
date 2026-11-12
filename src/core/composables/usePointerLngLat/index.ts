import { computed, ref } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import type { NormalizedLngLat } from '~shared/coordinate'
import type { MapMouseEvent } from '~types/sgmap'

export interface UsePointerLngLatOptions {
  /** 节流间隔（毫秒）；不传则用 requestAnimationFrame 合并高频更新。 */
  throttle?: number
}

/**
 * 跟踪鼠标位置对应的经纬度。
 *
 * @example
 * ```ts
 * const { lng, lat, isInside } = usePointerLngLat()
 * ```
 */
export function usePointerLngLat(options: UsePointerLngLatOptions = {}) {
  const { throttle } = options
  const context = useMapContext()

  const lng = ref<number>()
  const lat = ref<number>()
  const isInside = ref(false)

  const lngLat = computed<NormalizedLngLat | undefined>(() => {
    if (lng.value === undefined || lat.value === undefined) return undefined
    return { lng: lng.value, lat: lat.value }
  })

  const reset = () => {
    lng.value = undefined
    lat.value = undefined
    isInside.value = false
  }

  onMapReady(context, (map) => {
    let frame: number | undefined
    let lastUpdate = 0
    let latest: MapMouseEvent | undefined

    const flush = () => {
      if (!latest) return
      const point = map.unproject(latest.point)
      lng.value = point.lng
      lat.value = point.lat
      isInside.value = true
    }

    const handleMove = (event: MapMouseEvent) => {
      latest = event

      if (throttle !== undefined) {
        const now = Date.now()
        if (now - lastUpdate < throttle) return
        lastUpdate = now
        flush()
        return
      }

      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = undefined
        flush()
      })
    }

    const handleOut = () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
        frame = undefined
      }
      latest = undefined
      isInside.value = false
    }

    map.on('mousemove', handleMove)
    map.on('mouseout', handleOut)

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = undefined
      latest = undefined
      map.off('mousemove', handleMove)
      map.off('mouseout', handleOut)
    }
  })

  return { lng, lat, lngLat, isInside, reset }
}
