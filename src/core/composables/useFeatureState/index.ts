import { getCurrentScope, onScopeDispose } from 'vue'
import { useMapContext } from '~composables/useMap'
import type { FeatureStateTarget, SgMapInstance } from '~types/sgmap'

export interface UseFeatureStateReturn {
  set: (id: string | number, state: Record<string, unknown>) => void
  get: (id: string | number) => Record<string, unknown> | undefined
  remove: (id: string | number, key?: string) => void
  clear: () => void
}

/**
 * 管理某个数据源上的 feature-state，并在作用域销毁时清除所有已修改的要素状态。
 *
 * @example
 * ```ts
 * const state = useFeatureState('districts')
 * state.set(featureId, { highlight: true })
 * ```
 */
export function useFeatureState(sourceId: string): UseFeatureStateReturn {
  const context = useMapContext()
  const touched = new Set<string | number>()

  const getMap = (): SgMapInstance | undefined => context?.map.value

  const target = (id: string | number): FeatureStateTarget => ({ source: sourceId, id })

  const set = (id: string | number, state: Record<string, unknown>) => {
    const map = getMap()
    if (!map) return
    map.setFeatureState(target(id), state)
    touched.add(id)
  }

  const get = (id: string | number) => getMap()?.getFeatureState(target(id))

  const remove = (id: string | number, key?: string) => {
    const map = getMap()
    if (!map) return
    map.removeFeatureState(target(id), key)
    if (key === undefined) touched.delete(id)
  }

  const clear = () => {
    const map = getMap()
    if (map) {
      for (const id of touched) map.removeFeatureState(target(id))
    }
    touched.clear()
  }

  if (getCurrentScope()) {
    onScopeDispose(clear)
  }

  return { set, get, remove, clear }
}
