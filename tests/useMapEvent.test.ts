import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useMapClick } from '~composables/useMapClick'
import { useMapEvent } from '~composables/useMapEvent'
import { usePointerLngLat } from '~composables/usePointerLngLat'
import { createMockMap } from './helpers/mockMap'
import { mountWithMap } from './helpers/mountWithMap'

const clickEvent = { point: { x: 1, y: 2 }, lngLat: { lng: 1, lat: 2 } }

describe('useMapEvent', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('就绪后注册监听，卸载时自动 off', async () => {
    const mock = createMockMap()
    const map = mock.map
    const listener = vi.fn()

    const { wrapper } = await mountWithMap(map, () => useMapEvent('click', listener, { layerId: 'stations' }))

    expect(map.on).toHaveBeenCalledWith('click', 'stations', listener)

    mock.emit('click', clickEvent)
    expect(listener).toHaveBeenCalledTimes(1)

    wrapper.unmount()

    expect(map.off).toHaveBeenCalledWith('click', 'stations', listener)
    expect(map.off).toHaveBeenCalledTimes(1)
  })

  it('地图未就绪时先挂起，load 后再注册', async () => {
    const mock = createMockMap({ loaded: false })
    const listener = vi.fn()

    const { wrapper } = await mountWithMap(mock.map, () =>
      useMapEvent('mousemove', listener),
    )

    expect(mock.map.on).not.toHaveBeenCalled()

    mock.emit('load')
    await flushPromises()

    expect(mock.map.on).toHaveBeenCalledWith('mousemove', listener)

    wrapper.unmount()
  })
})

describe('useMapClick', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('单击在延迟后以 clickType = 1 触发', async () => {
    const mock = createMockMap()
    const handler = vi.fn()

    const { wrapper } = await mountWithMap(mock.map, () => useMapClick(handler))

    vi.useFakeTimers()
    mock.emit('click', clickEvent)
    vi.advanceTimersByTime(500)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toMatchObject({ clickType: 1 })

    wrapper.unmount()
  })

  it('双击以 clickType = 2 触发，且不再触发单击', async () => {
    const mock = createMockMap()
    const handler = vi.fn()

    const { wrapper } = await mountWithMap(mock.map, () => useMapClick(handler))

    vi.useFakeTimers()
    mock.emit('click', clickEvent)
    vi.advanceTimersByTime(100)
    mock.emit('click', clickEvent)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toMatchObject({ clickType: 2 })

    vi.advanceTimersByTime(1000)
    expect(handler).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('可选填充 queryRenderedFeatures 结果', async () => {
    const mock = createMockMap()
    const map = mock.map
    const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} }
    vi.mocked(map.queryRenderedFeatures).mockReturnValue([feature] as never)

    const handler = vi.fn()
    const { wrapper } = await mountWithMap(map, () =>
      useMapClick(handler, { queryFeatures: true, layers: ['points'] }),
    )

    vi.useFakeTimers()
    mock.emit('click', clickEvent)
    vi.advanceTimersByTime(500)

    expect(map.queryRenderedFeatures).toHaveBeenCalledWith([1, 2], { layers: ['points'] })
    expect(handler.mock.calls[0][0].features).toEqual([feature])

    wrapper.unmount()
  })
})

describe('usePointerLngLat', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('鼠标移动更新经纬度，移出后 isInside 为 false', async () => {
    const mock = createMockMap()

    const { result, wrapper } = await mountWithMap(mock.map, () => usePointerLngLat({ throttle: 0 }))

    mock.emit('mousemove', { point: { x: 100, y: 200 } })
    expect(result.lng.value).toBe(10)
    expect(result.lat.value).toBe(20)
    expect(result.isInside.value).toBe(true)
    expect(result.lngLat.value).toEqual({ lng: 10, lat: 20 })

    mock.emit('mouseout')
    expect(result.isInside.value).toBe(false)

    result.reset()
    expect(result.lng.value).toBeUndefined()

    wrapper.unmount()
  })

  it('卸载后不再更新', async () => {
    const mock = createMockMap()
    const { result, wrapper } = await mountWithMap(mock.map, () => usePointerLngLat({ throttle: 0 }))

    wrapper.unmount()

    mock.emit('mousemove', { point: { x: 999, y: 999 } })
    expect(result.lng.value).toBeUndefined()
  })
})
