import { shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import type { GeoJSONData, SgGeoJSONSource, SgMapInstance } from '~types/sgmap'

export interface UseGeoJSONSourceOptions {
  /** 是否对 `data` 做深度监听，默认 `false`（按引用比较）。 */
  deep?: boolean
}

export interface UseGeoJSONSourceReturn {
  source: ShallowRef<SgGeoJSONSource | undefined>
  setData: (data: GeoJSONData) => void
  refresh: () => void
  remove: () => void
}

/**
 * 声明式管理一个 GeoJSON 数据源。
 *
 * 地图就绪后自动 `addSource`，`data` 变化时只调用 `setData`（不重建数据源），
 * 作用域销毁时只移除本模块创建的数据源。
 *
 * @example
 * ```ts
 * const data = ref<GeoJSONData>({ type: 'FeatureCollection', features: [] })
 * const { setData } = useGeoJSONSource('orders', data)
 * ```
 */
export function useGeoJSONSource(
  id: string,
  data: MaybeRefOrGetter<GeoJSONData>,
  options: UseGeoJSONSourceOptions = {},
): UseGeoJSONSourceReturn {
  const context = useMapContext()
  const source = shallowRef<SgGeoJSONSource>()

  let owned = false
  let readyMap: SgMapInstance | undefined
  let active = true

  const apply = (map: SgMapInstance) => {
    const existing = map.getSource<SgGeoJSONSource>(id)

    if (existing) {
      source.value = existing
      return
    }

    map.addSource(id, { type: 'geojson', data: toValue(data) })
    owned = true
    source.value = map.getSource<SgGeoJSONSource>(id)
  }

  const remove = () => {
    active = false
    source.value = undefined

    if (!owned || !readyMap) return
    if (!readyMap.getSource(id)) return

    readyMap.removeSource(id)
    owned = false
  }

  const setData = (value: GeoJSONData) => {
    source.value?.setData(value)
  }

  const refresh = () => {
    setData(toValue(data))
  }

  onMapReady(context, (map) => {
    if (!active) return

    readyMap = map
    apply(map)

    const stopWatch = watch(
      () => toValue(data),
      (value) => {
        if (!active) return
        source.value?.setData(value)
      },
      { deep: options.deep ?? false },
    )

    return () => {
      stopWatch()
      remove()
    }
  })

  return { source, setData, refresh, remove }
}
