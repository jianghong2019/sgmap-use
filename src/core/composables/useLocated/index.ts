import { computed, ref, toValue, watch, type CSSProperties, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import type { MaybeLngLat } from '~shared/coordinate'
import type { SgMapInstance } from '~types/sgmap'
import { toLngLat } from '~utils/toLngLat'

export type LocatedPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'right'
  | 'center'

const TRANSFORMS: Record<LocatedPlacement, string> = {
  top: 'translate(-50%, -100%)',
  topLeft: 'translate(0, -100%)',
  topRight: 'translate(-100%, -100%)',
  bottom: 'translate(-50%, 0)',
  bottomLeft: 'translate(0, 0)',
  bottomRight: 'translate(-100%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
  center: 'translate(-50%, -50%)',
}

export interface UseLocatedOptions {
  /** 锚点位置，默认 `'top'`。 */
  placement?: MaybeRefOrGetter<LocatedPlacement>
  /** 额外像素偏移 `[x, y]`。 */
  offset?: MaybeRefOrGetter<[number, number]>
  /** 是否显示，默认 `true`。 */
  visible?: MaybeRefOrGetter<boolean>
}

export interface UseLocatedReturn {
  x: Ref<number>
  y: Ref<number>
  show: ComputedRef<boolean>
  style: ComputedRef<CSSProperties>
}

/**
 * 把 DOM 锚定在经纬度上。
 *
 * 通过 `map.project` 把地理坐标转换为容器内像素坐标，并在地图平移/缩放时更新。
 *
 * @example
 * ```ts
 * const { style, show } = useLocated(() => [116.39, 39.9], { placement: 'top' })
 * ```
 */
export function useLocated(
  coordinate: MaybeRefOrGetter<MaybeLngLat>,
  options: UseLocatedOptions = {},
): UseLocatedReturn {
  const context = useMapContext()

  const x = ref(0)
  const y = ref(0)
  const inView = ref(false)

  let mapRef: SgMapInstance | undefined

  const update = () => {
    if (!mapRef) {
      inView.value = false
      return
    }

    try {
      const point = mapRef.project(toLngLat(toValue(coordinate)))
      x.value = point.x
      y.value = point.y
      inView.value = true
    } catch {
      inView.value = false
    }
  }

  const show = computed(() => (toValue(options.visible) ?? true) && inView.value)

  const style = computed<CSSProperties>(() => {
    const [offsetX, offsetY] = toValue(options.offset) ?? [0, 0]
    const placement = toValue(options.placement) ?? 'top'

    return {
      position: 'absolute',
      left: `${x.value + offsetX}px`,
      top: `${y.value + offsetY}px`,
      transform: TRANSFORMS[placement],
      display: show.value ? undefined : 'none',
      zIndex: 10,
      willChange: 'left, top, transform',
    }
  })

  onMapReady(context, (map) => {
    mapRef = map
    update()

    map.on('move', update)
    map.on('zoom', update)
    map.on('resize', update)

    const stopWatch = watch(
      () => [toValue(coordinate), toValue(options.placement), toValue(options.offset), toValue(options.visible)],
      update,
    )

    return () => {
      stopWatch()
      map.off('move', update)
      map.off('zoom', update)
      map.off('resize', update)
      mapRef = undefined
      inView.value = false
    }
  })

  return { x, y, show, style }
}
