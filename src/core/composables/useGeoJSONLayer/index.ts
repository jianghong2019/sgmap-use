import {
  computed,
  ref,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import { diffSpecification } from '~shared/style'
import type {
  FilterSpecification,
  GeoJSONData,
  GeoJSONSourceSpecification,
  LayerSpecification,
  LayoutSpecification,
  PaintSpecification,
  SgGeoJSONSource,
  SgMapInstance,
} from '~types/sgmap'

export interface ClusterOptions {
  radius?: number
  maxZoom?: number
}

export interface UseGeoJSONLayerOptions {
  /** 图层类型，如 `fill` / `line` / `symbol` / `circle`。 */
  type: string
  paint?: MaybeRefOrGetter<PaintSpecification | undefined>
  layout?: MaybeRefOrGetter<LayoutSpecification | undefined>
  filter?: MaybeRefOrGetter<FilterSpecification | null | undefined>
  visible?: MaybeRefOrGetter<boolean>
  beforeId?: string
  minzoom?: number
  maxzoom?: number
  /** 数据源 id，默认 `${id}-source`。 */
  sourceId?: string
  /** 是否开启聚合；传对象可配置半径与最大层级。 */
  cluster?: boolean | ClusterOptions
}

export interface UseGeoJSONLayerReturn {
  sourceId: string
  source: ShallowRef<SgGeoJSONSource | undefined>
  layer: ShallowRef<LayerSpecification | undefined>
  visible: ComputedRef<boolean>
  setData: (data: GeoJSONData) => void
  refresh: () => void
  setVisible: (value: boolean) => void
  setPaint: (name: string, value: unknown) => void
  setLayout: (name: string, value: unknown) => void
  setFilter: (filter?: FilterSpecification | null) => void
  remove: () => void
}

/**
 * 一步创建 GeoJSON 数据源 + 图层，并管理其生命周期。
 *
 * 数据变化只更新数据源；样式变化增量更新；销毁时先移除图层再移除数据源。
 *
 * @example
 * ```ts
 * const data = ref<GeoJSONData>({ type: 'FeatureCollection', features: [] })
 * useGeoJSONLayer('stations', data, {
 *   type: 'circle',
 *   paint: { 'circle-color': '#409EFF', 'circle-radius': 6 },
 * })
 * ```
 */
export function useGeoJSONLayer(
  id: string,
  data: MaybeRefOrGetter<GeoJSONData>,
  options: UseGeoJSONLayerOptions,
): UseGeoJSONLayerReturn {
  const context = useMapContext()
  const sourceId = options.sourceId ?? `${id}-source`

  const source = shallowRef<SgGeoJSONSource>()
  const layer = shallowRef<LayerSpecification>()
  const visibleRef = ref(toValue(options.visible) ?? true)

  let mapRef: SgMapInstance | undefined
  let ownedSource = false
  let ownedLayer = false
  let active = true
  let previousPaint = toValue(options.paint)
  let previousLayout = toValue(options.layout)
  const stoppers: Array<() => void> = []

  const setData = (value: GeoJSONData) => {
    source.value?.setData(value)
  }

  const refresh = () => {
    setData(toValue(data))
  }

  const applyVisible = () => {
    mapRef?.setLayoutProperty(id, 'visibility', visibleRef.value ? 'visible' : 'none')
  }

  const setVisible = (value: boolean) => {
    visibleRef.value = value
  }

  const setPaint = (name: string, value: unknown) => {
    mapRef?.setPaintProperty(id, name, value)
    previousPaint = { ...(previousPaint ?? {}), [name]: value }
  }

  const setLayout = (name: string, value: unknown) => {
    mapRef?.setLayoutProperty(id, name, value)
    previousLayout = { ...(previousLayout ?? {}), [name]: value }
  }

  const setFilter = (filter?: FilterSpecification | null) => {
    mapRef?.setFilter(id, filter ?? null)
  }

  const remove = () => {
    active = false

    for (const stop of stoppers.splice(0)) stop()

    const map = mapRef
    mapRef = undefined

    if (ownedLayer && map?.getLayer(id)) map.removeLayer(id)
    if (ownedSource && map?.getSource(sourceId)) map.removeSource(sourceId)

    ownedLayer = false
    ownedSource = false
    source.value = undefined
    layer.value = undefined
  }

  onMapReady(context, (map) => {
    if (!active) return

    mapRef = map

    const sourceSpecification: GeoJSONSourceSpecification = {
      type: 'geojson',
      data: toValue(data),
    }

    if (options.cluster !== undefined) {
      sourceSpecification.cluster = Boolean(options.cluster)
      if (typeof options.cluster === 'object') {
        if (options.cluster.radius !== undefined) {
          sourceSpecification.clusterRadius = options.cluster.radius
        }
        if (options.cluster.maxZoom !== undefined) {
          sourceSpecification.clusterMaxZoom = options.cluster.maxZoom
        }
      }
    }

    const existing = map.getSource<SgGeoJSONSource>(sourceId)
    if (existing) {
      source.value = existing
    } else {
      map.addSource(sourceId, sourceSpecification)
      ownedSource = true
      source.value = map.getSource<SgGeoJSONSource>(sourceId)
    }

    if (!map.getLayer(id)) {
      const specification: LayerSpecification = { id, type: options.type, source: sourceId }

      if (options.minzoom !== undefined) specification.minzoom = options.minzoom
      if (options.maxzoom !== undefined) specification.maxzoom = options.maxzoom

      const paint = toValue(options.paint)
      if (paint) specification.paint = paint

      specification.layout = {
        ...(toValue(options.layout) ?? {}),
        visibility: visibleRef.value ? 'visible' : 'none',
      }

      const filter = toValue(options.filter)
      if (filter) specification.filter = filter

      map.addLayer(specification, options.beforeId)
      ownedLayer = true
    } else {
      applyVisible()
    }

    layer.value = map.getLayer(id)
    previousPaint = toValue(options.paint)
    previousLayout = toValue(options.layout)

    stoppers.push(
      watch(
        () => toValue(data),
        (value) => {
          if (!active) return
          source.value?.setData(value)
        },
      ),
      watch(
        () => toValue(options.visible),
        (value) => {
          if (value === undefined) return
          visibleRef.value = value
        },
      ),
      watch(visibleRef, (value) => {
        if (!active) return
        map.setLayoutProperty(id, 'visibility', value ? 'visible' : 'none')
      }),
      watch(
        () => toValue(options.paint),
        (next) => {
          if (!active) return
          const { changed, removed } = diffSpecification(previousPaint, next)
          for (const [name, value] of changed) map.setPaintProperty(id, name, value)
          for (const name of removed) map.setPaintProperty(id, name, undefined)
          previousPaint = next
        },
      ),
      watch(
        () => toValue(options.layout),
        (next) => {
          if (!active) return
          const { changed, removed } = diffSpecification(previousLayout, next)
          for (const [name, value] of changed) map.setLayoutProperty(id, name, value)
          for (const name of removed) map.setLayoutProperty(id, name, undefined)
          previousLayout = next
        },
      ),
      watch(
        () => toValue(options.filter),
        (next) => {
          if (!active) return
          map.setFilter(id, next ?? null)
        },
      ),
    )

    return remove
  })

  return {
    sourceId,
    source,
    layer,
    visible: computed(() => visibleRef.value),
    setData,
    refresh,
    setVisible,
    setPaint,
    setLayout,
    setFilter,
    remove,
  }
}
