import { describe, expect, it, vi } from 'vitest'
import { useViewportFeatures } from '~composables/useViewportFeatures'
import { createMockMap } from './helpers/mockMap'
import { mountWithMap } from './helpers/mountWithMap'

const feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [116, 39] },
  properties: { id: 1, status: 'active' },
}

function mockBounds(mock: ReturnType<typeof createMockMap>) {
  vi.mocked(mock.map.getBounds!).mockReturnValue({
    _sw: { lng: 116, lat: 39 },
    _ne: { lng: 117, lat: 40 },
  } as never)
}

describe('useViewportFeatures', () => {
  it('就绪后立即查询，并归一化图层、过滤条件与视口范围', async () => {
    const mock = createMockMap()
    vi.mocked(mock.map.queryRenderedFeatures).mockReturnValue([feature] as never)
    mockBounds(mock)

    const { result, wrapper } = await mountWithMap(mock.map, () =>
      useViewportFeatures({
        layers: ['stations'],
        filter: ['==', 'status', 'active'],
        throttle: 0,
      }),
    )

    expect(mock.map.queryRenderedFeatures).toHaveBeenCalledWith(undefined, {
      layers: ['stations'],
      filter: ['==', 'status', 'active'],
    })
    expect(result.features.value).toEqual([feature])
    expect(result.bounds.value).toEqual({ west: 116, south: 39, east: 117, north: 40 })

    wrapper.unmount()
  })

  it('默认在 moveend / zoomend / idle 后刷新', async () => {
    const mock = createMockMap()
    vi.mocked(mock.map.queryRenderedFeatures).mockReturnValue([feature] as never)
    mockBounds(mock)

    const { wrapper } = await mountWithMap(mock.map, () =>
      useViewportFeatures({ throttle: 0 }),
    )

    expect(mock.map.on).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(mock.map.on).toHaveBeenCalledWith('zoomend', expect.any(Function))
    expect(mock.map.on).toHaveBeenCalledWith('idle', expect.any(Function))

    vi.mocked(mock.map.queryRenderedFeatures).mockClear()

    mock.emit('idle')
    expect(mock.map.queryRenderedFeatures).toHaveBeenCalledTimes(1)

    mock.emit('moveend')
    expect(mock.map.queryRenderedFeatures).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('支持自定义事件，只监听 idle', async () => {
    const mock = createMockMap()
    vi.mocked(mock.map.queryRenderedFeatures).mockReturnValue([feature] as never)
    mockBounds(mock)

    const { wrapper } = await mountWithMap(mock.map, () =>
      useViewportFeatures({
        events: ['idle'],
        immediate: false,
        throttle: 0,
      }),
    )

    expect(mock.map.on).toHaveBeenCalledWith('idle', expect.any(Function))
    expect(mock.map.on).not.toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(mock.map.queryRenderedFeatures).not.toHaveBeenCalled()

    mock.emit('idle')
    expect(mock.map.queryRenderedFeatures).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('refresh 可手动重新查询，卸载时注销所有事件', async () => {
    const mock = createMockMap()
    vi.mocked(mock.map.queryRenderedFeatures).mockReturnValue([feature] as never)
    mockBounds(mock)

    const { result, wrapper } = await mountWithMap(mock.map, () =>
      useViewportFeatures({ immediate: false, throttle: 0 }),
    )

    result.refresh()
    expect(mock.map.queryRenderedFeatures).toHaveBeenCalledTimes(1)

    wrapper.unmount()

    expect(mock.map.off).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(mock.map.off).toHaveBeenCalledWith('zoomend', expect.any(Function))
    expect(mock.map.off).toHaveBeenCalledWith('idle', expect.any(Function))
  })

  it('无法获取范围时 bounds 为 undefined', async () => {
    const mock = createMockMap()
    vi.mocked(mock.map.queryRenderedFeatures).mockReturnValue([] as never)
    vi.mocked(mock.map.getBounds!).mockReturnValue(undefined as never)

    const { result, wrapper } = await mountWithMap(mock.map, () =>
      useViewportFeatures({ throttle: 0 }),
    )

    expect(result.bounds.value).toBeUndefined()

    wrapper.unmount()
  })
})
