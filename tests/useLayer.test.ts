import { computed, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useFeatureState } from '~composables/useFeatureState'
import { useGeoJSONLayer } from '~composables/useGeoJSONLayer'
import { useGeoJSONSource } from '~composables/useGeoJSONSource'
import { useLayer } from '~composables/useLayer'
import type { GeoJSONData } from '~types/sgmap'
import { createMockMap } from './helpers/mockMap'
import { mountWithMap } from './helpers/mountWithMap'

const emptyCollection: GeoJSONData = { type: 'FeatureCollection', features: [] }
const nextCollection: GeoJSONData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: 1, properties: {}, geometry: { type: 'Point', coordinates: [116, 39] } },
  ],
}

describe('useGeoJSONSource', () => {
  it('创建数据源，数据变化只调用 setData，卸载时移除', async () => {
    const mock = createMockMap()
    const data = ref<GeoJSONData>(emptyCollection)

    const { wrapper } = await mountWithMap(mock.map, () => useGeoJSONSource('orders', data))

    expect(mock.map.addSource).toHaveBeenCalledWith('orders', {
      type: 'geojson',
      data: emptyCollection,
    })

    data.value = nextCollection
    await nextTick()

    expect(mock.map.addSource).toHaveBeenCalledTimes(1)
    expect(mock.sources.get('orders')?.setData).toHaveBeenCalledWith(nextCollection)

    wrapper.unmount()
    expect(mock.map.removeSource).toHaveBeenCalledWith('orders')
  })

  it('宿主已存在的同名数据源不会被移除', async () => {
    const mock = createMockMap()
    const existing = { setData: vi.fn() }
    mock.sources.set('orders', existing)
    const data = ref<GeoJSONData>(emptyCollection)

    const { wrapper } = await mountWithMap(mock.map, () => useGeoJSONSource('orders', data))

    expect(mock.map.addSource).not.toHaveBeenCalled()

    wrapper.unmount()
    expect(mock.map.removeSource).not.toHaveBeenCalled()
  })
})

describe('useLayer', () => {
  it('创建图层，样式变化只更新发生变化的键，显隐切换生效', async () => {
    const mock = createMockMap()
    const color = ref('#fff')
    const visible = ref(true)

    const { wrapper } = await mountWithMap(mock.map, () =>
      useLayer({
        id: 'fill',
        type: 'fill',
        source: 'src',
        paint: computed(() => ({ 'fill-color': color.value, 'fill-opacity': 0.4 })),
        visible,
      }),
    )

    expect(mock.map.addLayer).toHaveBeenCalledTimes(1)
    expect(mock.map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fill',
        type: 'fill',
        source: 'src',
        paint: { 'fill-color': '#fff', 'fill-opacity': 0.4 },
        layout: { visibility: 'visible' },
      }),
      undefined,
    )

    color.value = '#000'
    await nextTick()

    expect(vi.mocked(mock.map.setPaintProperty).mock.calls).toEqual([['fill', 'fill-color', '#000']])

    visible.value = false
    await nextTick()

    expect(mock.map.setLayoutProperty).toHaveBeenCalledWith('fill', 'visibility', 'none')

    wrapper.unmount()
    expect(mock.map.removeLayer).toHaveBeenCalledWith('fill')
  })
})

describe('useGeoJSONLayer', () => {
  it('先建数据源再建图层，卸载时先移除图层再移除数据源', async () => {
    const mock = createMockMap()
    const data = ref<GeoJSONData>(emptyCollection)

    const { result, wrapper } = await mountWithMap(mock.map, () =>
      useGeoJSONLayer('stations', data, {
        type: 'circle',
        paint: { 'circle-radius': 6 },
        cluster: { radius: 50, maxZoom: 12 },
      }),
    )

    expect(result.sourceId).toBe('stations-source')
    expect(mock.map.addSource).toHaveBeenCalledWith(
      'stations-source',
      expect.objectContaining({
        type: 'geojson',
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 12,
      }),
    )

    const addSourceOrder = vi.mocked(mock.map.addSource).mock.invocationCallOrder[0]
    const addLayerOrder = vi.mocked(mock.map.addLayer).mock.invocationCallOrder[0]
    expect(addSourceOrder).toBeLessThan(addLayerOrder)

    wrapper.unmount()

    const removeLayerOrder = vi.mocked(mock.map.removeLayer).mock.invocationCallOrder[0]
    const removeSourceOrder = vi.mocked(mock.map.removeSource).mock.invocationCallOrder[0]
    expect(removeLayerOrder).toBeLessThan(removeSourceOrder)
  })
})

describe('useFeatureState', () => {
  it('记录已修改的要素并在卸载时统一清理', async () => {
    const mock = createMockMap()

    const { result, wrapper } = await mountWithMap(mock.map, () => useFeatureState('src'))

    result.set(1, { highlight: true })
    result.set('a', { highlight: true })

    expect(mock.map.setFeatureState).toHaveBeenCalledTimes(2)

    wrapper.unmount()

    expect(mock.map.removeFeatureState).toHaveBeenCalledWith({ source: 'src', id: 1 })
    expect(mock.map.removeFeatureState).toHaveBeenCalledWith({ source: 'src', id: 'a' })
  })
})
