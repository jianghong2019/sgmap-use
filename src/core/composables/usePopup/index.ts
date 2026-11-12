import { shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import { getSGMapLib } from '~shared/sdk'
import type { MaybeLngLat } from '~shared/coordinate'
import type { SgMapInstance, SgPopupInstance, SgPopupOptions } from '~types/sgmap'
import { toLngLat } from '~utils/toLngLat'

export interface UsePopupOptions extends SgPopupOptions {
  /** 传入后弹窗会跟随该坐标；坐标变化只更新位置，不重建实例。 */
  lngLat?: MaybeRefOrGetter<MaybeLngLat | undefined>
}

export interface UsePopupReturn {
  popup: ShallowRef<SgPopupInstance | undefined>
  show: (lngLat?: MaybeLngLat) => void
  hide: () => void
  setLngLat: (lngLat: MaybeLngLat) => void
  setHTML: (html: string) => void
  setText: (text: string) => void
  setDOMContent: (node: Node) => void
  setMaxWidth: (width: string) => void
}

/**
 * 声明式弹窗。
 *
 * @example
 * ```ts
 * const position = ref<[number, number]>([116.39, 39.9])
 * const { show, hide } = usePopup({ lngLat: position, closeButton: true })
 * show()
 * ```
 */
export function usePopup(options: UsePopupOptions = {}): UsePopupReturn {
  const context = useMapContext()
  const popup = shallowRef<SgPopupInstance>()

  let mapRef: SgMapInstance | undefined
  let added = false

  const setLngLat = (lngLat: MaybeLngLat) => {
    popup.value?.setLngLat(toLngLat(lngLat))
  }

  const show = (lngLat?: MaybeLngLat) => {
    if (!popup.value || !mapRef) return

    const value = lngLat ?? (options.lngLat ? toValue(options.lngLat) : undefined)
    if (value !== undefined) setLngLat(value)

    if (!added) {
      popup.value.addTo(mapRef)
      added = true
    }
  }

  const hide = () => {
    if (!popup.value) return
    popup.value.remove()
    added = false
  }

  const setHTML = (html: string) => {
    popup.value?.setHTML(html)
  }

  const setText = (text: string) => {
    popup.value?.setText(text)
  }

  const setDOMContent = (node: Node) => {
    popup.value?.setDOMContent(node)
  }

  const setMaxWidth = (width: string) => {
    popup.value?.setMaxWidth(width)
  }

  onMapReady(context, (map) => {
    mapRef = map

    const popupOptions = { ...options } as SgPopupOptions & { lngLat?: unknown }
    delete popupOptions.lngLat

    popup.value = new (getSGMapLib().Popup)(popupOptions)

    if (options.lngLat) {
      const initial = toValue(options.lngLat)
      if (initial !== undefined) show(initial)
    }

    const stopWatch = options.lngLat
      ? watch(
          () => toValue(options.lngLat),
          (value) => {
            if (value !== undefined) setLngLat(value)
          },
        )
      : undefined

    return () => {
      stopWatch?.()
      popup.value?.remove()
      popup.value = undefined
      added = false
      mapRef = undefined
    }
  })

  return { popup, show, hide, setLngLat, setHTML, setText, setDOMContent, setMaxWidth }
}
