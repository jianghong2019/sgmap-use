import { describe, expect, it, vi } from 'vitest'
import { useMapIdle } from '~composables/useMapIdle'
import { createMockMap } from './helpers/mockMap'
import { mountWithMap } from './helpers/mountWithMap'

describe('useMapIdle', () => {
  it('注册 idle 与活动事件，并主动触发一次重绘', async () => {
    const mock = createMockMap()
    const callback = vi.fn()

    const { result, wrapper } = await mountWithMap(mock.map, () => useMapIdle(callback))

    expect(mock.map.on).toHaveBeenCalledWith('idle', expect.any(Function))
    expect(mock.map.on).toHaveBeenCalledWith('movestart', expect.any(Function))
    expect(mock.map.triggerRepaint).toHaveBeenCalledTimes(1)

    mock.emit('idle')
    expect(callback).toHaveBeenCalledWith(mock.map)
    expect(result.isIdle.value).toBe(true)

    mock.emit('movestart')
    expect(result.isIdle.value).toBe(false)

    wrapper.unmount()
    expect(mock.map.off).toHaveBeenCalledWith('idle', expect.any(Function))
    expect(mock.map.off).toHaveBeenCalledWith('movestart', expect.any(Function))
  })

  it('默认每次 idle 都触发回调', async () => {
    const mock = createMockMap()
    const callback = vi.fn()

    const { wrapper } = await mountWithMap(mock.map, () => useMapIdle(callback))

    mock.emit('idle')
    mock.emit('idle')

    expect(callback).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('once 为 true 时只触发一次并自动停止监听', async () => {
    const mock = createMockMap()
    const callback = vi.fn()

    const { wrapper } = await mountWithMap(mock.map, () => useMapIdle(callback, { once: true }))

    mock.emit('idle')
    mock.emit('idle')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(mock.map.off).toHaveBeenCalledWith('idle', expect.any(Function))

    wrapper.unmount()
  })

  it('repaint 为 false 时不主动重绘', async () => {
    const mock = createMockMap()

    const { wrapper } = await mountWithMap(mock.map, () =>
      useMapIdle(undefined, { repaint: false }),
    )

    expect(mock.map.triggerRepaint).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('手动 stop 后不再响应 idle', async () => {
    const mock = createMockMap()
    const callback = vi.fn()

    const { result, wrapper } = await mountWithMap(mock.map, () => useMapIdle(callback))

    result.stop()
    mock.emit('idle')

    expect(callback).not.toHaveBeenCalled()
    expect(result.isIdle.value).toBe(false)

    wrapper.unmount()
  })
})
