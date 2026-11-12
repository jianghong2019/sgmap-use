import { defineComponent, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Located from '~components/Located/index.vue'
import SgMap from '~components/SgMap/index.vue'
import { useMapProvider } from '~composables/useMapProvider'
import { resetLoadSGMap } from '~utils/loadSGMap'
import { createMockMap, createMockSGMapLib } from './helpers/mockMap'

describe('SgMap 组件', () => {
  beforeEach(() => {
    resetLoadSGMap()
    document.getElementById('sgmap-use-sdk')?.remove()
    delete window.SGMap
  })

  afterEach(() => {
    resetLoadSGMap()
    delete window.SGMap
    document.body.innerHTML = ''
  })

  it('完成初始化后触发 load，slot 位于容器内部', async () => {
    const mock = createMockMap()
    const sdk = createMockSGMapLib(mock.map)
    window.SGMap = sdk.lib

    const wrapper = mount(SgMap, {
      props: {
        sdk: {},
        mapOptions: { zoom: 5 },
      },
      slots: {
        default: '<span class="slot-content">hello</span>',
      },
    })

    await flushPromises()

    expect(sdk.Map).toHaveBeenCalledTimes(1)
    expect(sdk.Map.mock.calls[0][0]).toMatchObject({ zoom: 5 })
    expect(wrapper.find('.sgmap-container').exists()).toBe(true)
    expect(wrapper.find('.slot-content').exists()).toBe(true)
    expect(wrapper.emitted('load')).toHaveLength(1)

    wrapper.unmount()
    expect(mock.map.remove).toHaveBeenCalled()
  })
})

describe('Located 组件', () => {
  it('按经纬度定位，并在坐标变化后更新', async () => {
    const mock = createMockMap()

    const Parent = defineComponent({
      components: { Located },
      setup() {
        const coordinate = ref<[number, number]>([10, 20])
        useMapProvider(() => mock.map)
        return { coordinate }
      },
      template: `<Located :coordinate="coordinate"><span class="content">x</span></Located>`,
    })

    const wrapper = mount(Parent)
    await flushPromises()

    const element = wrapper.find('.sgmap-located').element as HTMLElement
    expect(element.style.left).toBe('100px')
    expect(element.style.top).toBe('200px')
    expect(element.style.transform).toBe('translate(-50%, -100%)')
    expect(wrapper.find('.content').exists()).toBe(true)

    const vm = wrapper.vm as unknown as { coordinate: [number, number] }
    vm.coordinate = [30, 40]
    await nextTick()

    expect(element.style.left).toBe('300px')
    expect(element.style.top).toBe('400px')

    vi.mocked(mock.map.project).mockReturnValue({ x: 500, y: 600 })
    mock.emit('move')
    await nextTick()

    expect(element.style.left).toBe('500px')
    expect(element.style.top).toBe('600px')

    wrapper.unmount()
  })
})
