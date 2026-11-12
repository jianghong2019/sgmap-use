import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { useMapProvider } from '~composables/useMapProvider'
import type { SgMapInstance } from '~types/sgmap'

export interface MountWithMapResult<T> {
  wrapper: VueWrapper
  result: T
}

/**
 * 在带有 `useMapProvider` 的上下文中执行一个组合式函数，
 * 返回其返回值与组件包装器。
 */
export async function mountWithMap<T>(
  map: SgMapInstance,
  composable: () => T,
): Promise<MountWithMapResult<T>> {
  let result!: T

  const Child = defineComponent({
    name: 'TestChild',
    setup() {
      result = composable()
      return () => h('div', 'child')
    },
  })

  const Parent = defineComponent({
    name: 'TestParent',
    setup() {
      useMapProvider(() => map)
      return () => h(Child)
    },
  })

  const wrapper = mount(Parent)
  await flushPromises()

  return { wrapper, result }
}
