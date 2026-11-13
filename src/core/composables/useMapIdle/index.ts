import { ref, type Ref } from 'vue'
import { useMapContext } from '~composables/useMap'
import { onMapReady } from '~composables/useMapProvider'
import type { SgMapInstance } from '~types/sgmap'

/** 地图进入活动状态的事件，用于把 `isIdle` 置为 false。 */
const BUSY_EVENTS = ['movestart', 'zoomstart', 'rotatestart', 'pitchstart', 'dragstart'] as const

export interface UseMapIdleOptions {
  /** 是否只触发一次，默认 `false`。 */
  once?: boolean
  /**
   * 注册时是否强制重绘一次，默认 `true`。
   * 地图已处于空闲状态时不会再产生 `idle` 事件，主动重绘可以确保回调被触发。
   */
  repaint?: boolean
}

export interface UseMapIdleReturn {
  /** 地图当前是否处于空闲状态（最近一次 `idle` 之后没有新的交互/动画）。 */
  isIdle: Ref<boolean>
  /** 手动停止监听。 */
  stop: () => void
}

/**
 * 监听地图「最终画面」：所有交互、动画和资源加载结束后触发。
 *
 * 与逐帧的 `render` 不同，`idle` 只在渲染完全停止时触发，
 * 适合截图、导出、渲染完成统计等场景。
 *
 * @example
 * ```ts
 * const { isIdle } = useMapIdle(() => {
 *   console.log('渲染完成，可以截图了')
 * }, { once: true })
 * ```
 */
export function useMapIdle(
  callback?: (map: SgMapInstance) => void,
  options: UseMapIdleOptions = {},
): UseMapIdleReturn {
  const { once = false, repaint = true } = options
  const context = useMapContext()

  const isIdle = ref(false)

  let stopped = false
  let mapRef: SgMapInstance | undefined
  let idleHandler: (() => void) | undefined

  const busyHandlers = BUSY_EVENTS.map((type) => ({
    type,
    handler: () => {
      isIdle.value = false
    },
  }))

  const stop = () => {
    if (stopped) return
    stopped = true

    const map = mapRef
    mapRef = undefined

    if (!map) return

    if (idleHandler) map.off('idle', idleHandler)
    for (const { type, handler } of busyHandlers) map.off(type, handler)

    idleHandler = undefined
  }

  onMapReady(context, (map) => {
    if (stopped) return

    mapRef = map

    for (const { type, handler } of busyHandlers) map.on(type, handler)

    idleHandler = () => {
      if (stopped) return

      isIdle.value = true
      callback?.(map)

      if (once) stop()
    }

    map.on('idle', idleHandler)

    // 地图已空闲时不会自动产生 idle 事件，主动重绘一次。
    if (repaint) map.triggerRepaint?.()

    return stop
  })

  return { isIdle, stop }
}
