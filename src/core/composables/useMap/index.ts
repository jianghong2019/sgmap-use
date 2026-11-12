import { getCurrentInstance, inject } from 'vue'
import { handleError, sgmapError, type ErrorMode } from '~shared/errorHandler'
import { MAP_CONTEXT_KEY, type MapContext } from '~composables/useMapProvider'
import type { SgMapInstance } from '~types/sgmap'

/**
 * 获取当前地图实例。
 *
 * 由于地图通常在父组件 `onMounted` 中创建，`setup()` 阶段可能尚未就绪；
 * 需要等待时请使用 `useMapReady()` 或 `useMapContext()`。
 *
 * @param mode 缺少上下文时的错误策略，默认 `'throw-error'`
 */
export function useMap(mode: ErrorMode = 'throw-error'): SgMapInstance | undefined {
  if (!getCurrentInstance()) {
    handleError(mode, 'useMap() must be called inside setup()')
    return undefined
  }

  const context = inject(MAP_CONTEXT_KEY, undefined)

  if (!context) {
    handleError(mode, 'map is undefined')
    return undefined
  }

  if (!context.map.value) {
    handleError(mode, 'map is undefined')
    return undefined
  }

  return context.map.value
}

/** 获取地图上下文；不存在时返回 `undefined`，不报错。 */
export function useMapContext(): MapContext | undefined {
  if (!getCurrentInstance()) return undefined
  return inject(MAP_CONTEXT_KEY, undefined)
}

/** 等待地图就绪并返回实例。 */
export function useMapReady(): Promise<SgMapInstance> {
  const context = useMapContext()

  if (!context) {
    return Promise.reject(sgmapError('map context is undefined'))
  }

  return context.ready
}
