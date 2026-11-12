import { ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import { getSGMapLib } from '~shared/sdk'
import type { MaybeLngLat } from '~shared/coordinate'
import type { SgMapInstance, SgMarkerInstance, SgMarkerOptions } from '~types/sgmap'
import { toLngLat } from '~utils/toLngLat'

export interface UseMarkerReturn {
  marker: ShallowRef<SgMarkerInstance | undefined>
  visible: Ref<boolean>
  show: () => void
  hide: () => void
  setLngLat: (lngLat: MaybeLngLat) => void
}

/**
 * 声明式标记点，坐标变化时自动同步。
 *
 * @example
 * ```ts
 * const position = ref<[number, number]>([116.39, 39.9])
 * const { marker } = useMarker(position, { color: '#409EFF' })
 * ```
 */
export function useMarker(
  lngLat: MaybeRefOrGetter<MaybeLngLat>,
  options: SgMarkerOptions = {},
): UseMarkerReturn {
  const context = useMapContext()
  const marker = shallowRef<SgMarkerInstance>()
  const visible = ref(false)
  const { element, ...markerOptions } = options

  let mapRef: SgMapInstance | undefined

  const setLngLat = (value: MaybeLngLat) => {
    marker.value?.setLngLat(toLngLat(value))
  }

  const show = () => {
    if (!marker.value || !mapRef) return
    marker.value.addTo(mapRef)
    visible.value = true
  }

  const hide = () => {
    if (!marker.value) return
    marker.value.remove()
    visible.value = false
  }

  onMapReady(context, (map) => {
    mapRef = map

    const instance = element
      ? new (getSGMapLib().Marker)({ ...markerOptions, element })
      : new (getSGMapLib().Marker)(markerOptions)

    instance.setLngLat(toLngLat(toValue(lngLat))).addTo(map)
    marker.value = instance
    visible.value = true

    const stopWatch = watch(
      () => toValue(lngLat),
      (value) => instance.setLngLat(toLngLat(value)),
    )

    return () => {
      stopWatch()
      instance.remove()
      marker.value = undefined
      visible.value = false
      mapRef = undefined
    }
  })

  return { marker, visible, show, hide, setLngLat }
}
