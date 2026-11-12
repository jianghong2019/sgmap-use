import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMap, useMapContext, useMapReady } from '~composables/useMap'
import { onMapReady, type MapContext } from '~composables/useMapProvider'
import { createMockMap } from './helpers/mockMap'
import { mountWithMap } from './helpers/mountWithMap'

function mountWithUseMap(mode: Parameters<typeof useMap>[0]) {
  return mount(
    defineComponent({
      setup() {
        useMap(mode)
      },
      render: () => h('div'),
    }),
  )
}

describe('useMapProvider / useMap', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('缺少 Provider 时三种错误模式行为不同', () => {
    expect(() => mountWithUseMap('throw-error')).toThrow('[sgmap-use]')

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => mountWithUseMap('no-throw-error')).not.toThrow()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[sgmap-use] map is undefined'))
    errorSpy.mockRestore()

    expect(() => mountWithUseMap('silent')).not.toThrow()
  })

  it('提供实例后，后代可获取 context 与 ready', async () => {
    const { map } = createMockMap()
    let context: MapContext | undefined

    const { result, wrapper } = await mountWithMap(map, () => {
      context = useMapContext()
      return useMapReady()
    })

    expect(context?.map.value).toBe(map)
    expect(context?.isLoaded.value).toBe(true)
    await expect(result).resolves.toBe(map)

    wrapper.unmount()
  })

  it('setup 阶段地图尚未创建时 useMap 返回 undefined', async () => {
    const { map } = createMockMap()
    let instance: unknown = 'unset'

    const { wrapper } = await mountWithMap(map, () => {
      instance = useMap('silent')
      return null
    })

    expect(instance).toBeUndefined()
    wrapper.unmount()
  })

  it('onMapReady 在就绪后只执行一次，并在卸载时清理', async () => {
    const { map } = createMockMap()
    const onReady = vi.fn()
    const onCleanup = vi.fn()

    const { wrapper } = await mountWithMap(map, () => {
      onMapReady(useMapContext(), () => {
        onReady()
        return onCleanup
      })
      return null
    })

    expect(onReady).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    await nextTick()

    expect(onCleanup).toHaveBeenCalledTimes(1)
  })

  it('地图未加载时等待 load 事件后再置为就绪', async () => {
    const mock = createMockMap({ loaded: false })
    const onReady = vi.fn()
    let context: MapContext | undefined

    const { wrapper } = await mountWithMap(mock.map, () => {
      context = useMapContext()
      onMapReady(context, () => onReady())
      return null
    })

    expect(onReady).not.toHaveBeenCalled()
    expect(context?.isLoaded.value).toBe(false)

    mock.emit('load')
    await flushPromises()

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(context?.isLoaded.value).toBe(true)

    wrapper.unmount()
  })
})
