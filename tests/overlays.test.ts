import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useMapImage, useStyleImageMissing } from '~composables/useMapImage'
import { useMapView } from '~composables/useMapView'
import { useMarker } from '~composables/useMarker'
import { usePopup } from '~composables/usePopup'
import { resetSGMapLib, setSGMapLib } from '~shared/sdk'
import { createMockMap, createMockSGMapLib, type MockSGMapLib } from './helpers/mockMap'
import { mountWithMap } from './helpers/mountWithMap'

function setupSdk() {
  const mock = createMockMap()
  const sdk = createMockSGMapLib(mock.map)
  setSGMapLib(sdk.lib)
  return { mock, sdk }
}

describe('覆盖物与视图', () => {
  let sdk: MockSGMapLib

  beforeEach(() => {
    sdk = setupSdk().sdk
  })

  afterEach(() => {
    resetSGMapLib()
    document.body.innerHTML = ''
  })

  it('usePopup 跟随坐标更新并在卸载时移除', async () => {
    const mock = createMockMap()
    const position = ref<[number, number]>([116, 39])

    const { wrapper } = await mountWithMap(mock.map, () =>
      usePopup({ lngLat: position, closeButton: true }),
    )

    expect(sdk.Popup).toHaveBeenCalledWith({ closeButton: true })
    expect(sdk.popup.addTo).toHaveBeenCalledWith(mock.map)
    expect(sdk.popup.setLngLat).toHaveBeenCalledWith({ lng: 116, lat: 39 })

    position.value = [117, 40]
    await nextTick()

    expect(sdk.popup.setLngLat).toHaveBeenLastCalledWith({ lng: 117, lat: 40 })

    wrapper.unmount()
    expect(sdk.popup.remove).toHaveBeenCalled()
  })

  it('useMarker 跟随坐标更新并在卸载时移除', async () => {
    const mock = createMockMap()
    const position = ref<[number, number]>([116, 39])

    const { result, wrapper } = await mountWithMap(mock.map, () =>
      useMarker(position, { color: '#409EFF' }),
    )

    expect(sdk.Marker).toHaveBeenCalledWith({ color: '#409EFF' })
    expect(sdk.marker.setLngLat).toHaveBeenCalledWith({ lng: 116, lat: 39 })
    expect(sdk.marker.addTo).toHaveBeenCalledWith(mock.map)
    expect(result.visible.value).toBe(true)

    position.value = [118, 41]
    await nextTick()

    expect(sdk.marker.setLngLat).toHaveBeenLastCalledWith({ lng: 118, lat: 41 })

    wrapper.unmount()
    expect(sdk.marker.remove).toHaveBeenCalled()
  })

  it('useMapView 归一化坐标后调用地图方法', async () => {
    const mock = createMockMap()

    const { result, wrapper } = await mountWithMap(mock.map, () => useMapView({ mode: 'silent' }))

    result.flyTo({ center: [116, 39], zoom: 12 })
    expect(mock.map.flyTo).toHaveBeenCalledWith({ zoom: 12, center: { lng: 116, lat: 39 } })

    result.easeTo({ center: { longitude: 116, latitude: 39 } })
    expect(mock.map.easeTo).toHaveBeenCalledWith({ center: { lng: 116, lat: 39 } })

    result.fitBounds(
      [
        [116, 39],
        [117, 40],
      ],
      { padding: 50 },
    )
    expect(mock.map.fitBounds).toHaveBeenCalledWith(
      [
        [116, 39],
        [117, 40],
      ],
      { padding: 50 },
    )

    result.zoomTo(15, { duration: 300 })
    expect(mock.map.zoomTo).toHaveBeenCalledWith(15, { duration: 300 })

    result.setMaxBounds(null)
    expect(mock.map.setMaxBounds).toHaveBeenCalledWith(null)

    expect(result.getCenter()).toEqual({ lng: 0, lat: 0 })
    expect(result.getZoom()).toBe(10)

    wrapper.unmount()
  })

  it('useMapImage 加载图片，卸载时移除本模块添加的图片', async () => {
    const mock = createMockMap()

    const { result, wrapper } = await mountWithMap(mock.map, () =>
      useMapImage('icon_1', '/icons/icon_1.png', { pixelRatio: 2 }),
    )

    expect(mock.map.loadImage).toHaveBeenCalledWith('/icons/icon_1.png', expect.any(Function))
    expect(mock.map.addImage).toHaveBeenCalledWith('icon_1', expect.anything(), { pixelRatio: 2 })
    expect(result.loaded.value).toBe(true)

    wrapper.unmount()
    expect(mock.map.removeImage).toHaveBeenCalledWith('icon_1')
  })

  it('useMapImage 已存在图片时跳过加载，且不移除宿主的图片', async () => {
    const mock = createMockMap()
    mock.images.add('icon_1')

    const { wrapper } = await mountWithMap(mock.map, () => useMapImage('icon_1', '/icons/icon_1.png'))

    expect(mock.map.loadImage).not.toHaveBeenCalled()
    expect(mock.map.addImage).not.toHaveBeenCalled()

    wrapper.unmount()
    expect(mock.map.removeImage).not.toHaveBeenCalled()
  })

  it('useStyleImageMissing 对同一 id 只加载一次', async () => {
    const mock = createMockMap()

    const { wrapper } = await mountWithMap(mock.map, () => {
      useStyleImageMissing({ icon_1: '/icons/icon_1.png' })
      return null
    })

    mock.emit('styleimagemissing', { id: 'icon_1' })
    mock.emit('styleimagemissing', { id: 'icon_1' })

    expect(mock.map.loadImage).toHaveBeenCalledTimes(1)
    expect(mock.map.addImage).toHaveBeenCalledWith('icon_1', expect.anything(), { pixelRatio: 2 })

    wrapper.unmount()
    expect(mock.map.off).toHaveBeenCalledWith('styleimagemissing', expect.any(Function))
  })
})
