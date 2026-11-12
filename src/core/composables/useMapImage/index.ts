import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import { handleError } from '~shared/errorHandler'
import type { SgMapInstance, StyleImageMissingEvent } from '~types/sgmap'

export interface UseMapImageOptions {
  pixelRatio?: number
  sdf?: boolean
}

export interface UseMapImageReturn {
  loaded: Ref<boolean>
  reload: () => void
}

/**
 * 加载并注册一张地图图片（可用于 `icon-image` / `*-pattern`）。
 *
 * 已存在同名图片时跳过；作用域销毁时只移除本模块添加的图片。
 */
export function useMapImage(
  id: string,
  url: MaybeRefOrGetter<string>,
  options: UseMapImageOptions = {},
): UseMapImageReturn {
  const context = useMapContext()
  const loaded = ref(false)

  let mapRef: SgMapInstance | undefined
  let owned = false
  let active = true
  let token = 0

  const load = (map: SgMapInstance, src: string) => {
    if (!active) return

    if (map.hasImage(id)) {
      loaded.value = true
      return
    }

    const current = ++token

    map.loadImage(src, (error, image) => {
      if (!active || current !== token) return

      if (error || !image) {
        handleError('no-throw-error', `failed to load image: ${src}`)
        return
      }

      if (!map.hasImage(id)) {
        map.addImage(id, image, options)
        owned = true
      }

      loaded.value = true
    })
  }

  const reload = () => {
    if (!mapRef) return
    load(mapRef, toValue(url))
  }

  onMapReady(context, (map) => {
    mapRef = map
    load(map, toValue(url))

    const stopWatch = watch(
      () => toValue(url),
      (src) => load(map, src),
    )

    return () => {
      active = false
      token += 1
      stopWatch()
      if (owned && map.hasImage(id)) map.removeImage(id)
      owned = false
      loaded.value = false
      mapRef = undefined
    }
  })

  return { loaded, reload }
}

export type StyleImageResolver = Record<string, string> | ((id: string) => string | undefined)

/**
 * 监听 `styleimagemissing`，自动补齐缺失图标。
 *
 * @example
 * ```ts
 * useStyleImageMissing({
 *   icon_order_1: '/icons/icon_order_1.png',
 * })
 * ```
 */
export function useStyleImageMissing(resolver: StyleImageResolver): void {
  const context = useMapContext()
  const loading = new Set<string>()

  onMapReady(context, (map) => {
    const handler = (event: StyleImageMissingEvent) => {
      const id = event.id

      if (!id || map.hasImage(id) || loading.has(id)) return

      const url = typeof resolver === 'function' ? resolver(id) : resolver[id]
      if (!url) return

      loading.add(id)

      map.loadImage(url, (error, image) => {
        loading.delete(id)

        if (error || !image || map.hasImage(id)) return

        map.addImage(id, image, { pixelRatio: 2 })
      })
    }

    map.on('styleimagemissing', handler)

    return () => {
      map.off('styleimagemissing', handler)
      loading.clear()
    }
  })
}
