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
  LayerSpecification,
  LayoutSpecification,
  PaintSpecification,
  SgMapInstance,
  SourceSpecification,
} from '~types/sgmap'

export interface UseLayerOptions {
  /** 图层 id（唯一）。 */
  id: string
  /** 图层类型，如 `fill` / `line` / `symbol` / `circle`。 */
  type: string
  /** 数据源 id 或内联数据源。 */
  source?: string | SourceSpecification
  paint?: MaybeRefOrGetter<PaintSpecification | undefined>
  layout?: MaybeRefOrGetter<LayoutSpecification | undefined>
  filter?: MaybeRefOrGetter<FilterSpecification | null | undefined>
  /** 插入到指定图层之前。 */
  beforeId?: string
  minzoom?: number
  maxzoom?: number
  visible?: MaybeRefOrGetter<boolean>
}

export interface UseLayerReturn {
  layer: ShallowRef<LayerSpecification | undefined>
  visible: ComputedRef<boolean>
  setVisible: (value: boolean) => void
  setPaint: (name: string, value: unknown) => void
  setLayout: (name: string, value: unknown) => void
  setFilter: (filter?: FilterSpecification | null) => void
  remove: () => void
}

/**
 * 声明式管理一个地图图层。
 *
 * - 地图就绪后自动 `addLayer`（已存在则跳过）
 * - `visible` / `paint` / `layout` / `filter` 变化时增量更新
 * - 作用域销毁时自动 `removeLayer`
 *
 * @example
 * ```ts
 * const color = ref('#68AFB0')
 * useLayer({
 *   id: 'district-fill',
 *   type: 'fill',
 *   source: 'district',
 *   paint: computed(() => ({ 'fill-color': color.value, 'fill-opacity': 0.4 })),
 * })
 * ```
 */
export function useLayer(options: UseLayerOptions): UseLayerReturn {
  const context = useMapContext()

  const layer = shallowRef<LayerSpecification>()
  const visibleRef = ref(toValue(options.visible) ?? true)

  let mapRef: SgMapInstance | undefined
  let active = true
  let ownedLayer = false
  let previousPaint = toValue(options.paint)
  let previousLayout = toValue(options.layout)
  const stoppers: Array<() => void> = []

  const applyVisible = () => {
    mapRef?.setLayoutProperty(options.id, 'visibility', visibleRef.value ? 'visible' : 'none')
  }

  const setVisible = (value: boolean) => {
    visibleRef.value = value
  }

  const setPaint = (name: string, value: unknown) => {
    mapRef?.setPaintProperty(options.id, name, value)
    previousPaint = { ...(previousPaint ?? {}), [name]: value }
  }

  const setLayout = (name: string, value: unknown) => {
    mapRef?.setLayoutProperty(options.id, name, value)
    previousLayout = { ...(previousLayout ?? {}), [name]: value }
  }

  const setFilter = (filter?: FilterSpecification | null) => {
    mapRef?.setFilter(options.id, filter ?? null)
  }

  const remove = () => {
    active = false

    for (const stop of stoppers.splice(0)) stop()

    const map = mapRef
    mapRef = undefined

    if (map?.getLayer(options.id) && ownedLayer) map.removeLayer(options.id)
    ownedLayer = false

    layer.value = undefined
  }

  onMapReady(context, (map) => {
    if (!active) return

    mapRef = map

    if (!map.getLayer(options.id)) {
      const specification: LayerSpecification = { id: options.id, type: options.type }

      if (options.source !== undefined) specification.source = options.source
      if (options.minzoom !== undefined) specification.minzoom = options.minzoom
      if (options.maxzoom !== undefined) specification.maxzoom = options.maxzoom

      const paint = toValue(options.paint)
      if (paint) specification.paint = paint

      const layout: LayoutSpecification = {
        ...(toValue(options.layout) ?? {}),
        visibility: visibleRef.value ? 'visible' : 'none',
      }
      specification.layout = layout

      const filter = toValue(options.filter)
      if (filter) specification.filter = filter

      map.addLayer(specification, options.beforeId)
      ownedLayer = true
    } else {
      applyVisible()
    }

    layer.value = map.getLayer(options.id)
    previousPaint = toValue(options.paint)
    previousLayout = toValue(options.layout)

    stoppers.push(
      watch(
        () => toValue(options.visible),
        (value) => {
          if (value === undefined) return
          visibleRef.value = value
        },
      ),
      watch(visibleRef, (value) => {
        if (!active) return
        map.setLayoutProperty(options.id, 'visibility', value ? 'visible' : 'none')
      }),
      watch(
        () => toValue(options.paint),
        (next) => {
          if (!active) return
          const { changed, removed } = diffSpecification(previousPaint, next)
          for (const [name, value] of changed) map.setPaintProperty(options.id, name, value)
          for (const name of removed) map.setPaintProperty(options.id, name, undefined)
          previousPaint = next
        },
      ),
      watch(
        () => toValue(options.layout),
        (next) => {
          if (!active) return
          const { changed, removed } = diffSpecification(previousLayout, next)
          for (const [name, value] of changed) map.setLayoutProperty(options.id, name, value)
          for (const name of removed) map.setLayoutProperty(options.id, name, undefined)
          previousLayout = next
        },
      ),
      watch(
        () => toValue(options.filter),
        (next) => {
          if (!active) return
          map.setFilter(options.id, next ?? null)
        },
      ),
    )

    return remove
  })

  return {
    layer,
    visible: computed(() => visibleRef.value),
    setVisible,
    setPaint,
    setLayout,
    setFilter,
    remove,
  }
}
