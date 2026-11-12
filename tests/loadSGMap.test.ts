import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SG_MAP_SRC, loadSGMap, resetLoadSGMap } from '~utils/loadSGMap'
import { createMockMap, createMockSGMapLib } from './helpers/mockMap'

function findScript() {
  return document.getElementById('sgmap-use-sdk') as HTMLScriptElement | null
}

describe('loadSGMap', () => {
  beforeEach(() => {
    resetLoadSGMap()
    findScript()?.remove()
    delete window.SGMap
  })

  afterEach(() => {
    resetLoadSGMap()
    findScript()?.remove()
    delete window.SGMap
  })

  it('首次调用注入脚本，并发调用复用同一个 Promise', async () => {
    const { map } = createMockMap()
    const mock = createMockSGMapLib(map)

    const first = loadSGMap()
    const second = loadSGMap()

    expect(second).toBe(first)

    const script = findScript()
    expect(script).not.toBeNull()
    expect(script?.src).toBe(DEFAULT_SG_MAP_SRC)

    window.SGMap = mock.lib
    script?.dispatchEvent(new Event('load'))

    await expect(first).resolves.toBe(mock.lib)
    expect(loadSGMap()).toBe(first)
    expect(document.querySelectorAll('#sgmap-use-sdk')).toHaveLength(1)
  })

  it('window.SGMap 已存在时不注入脚本，并执行认证与插件加载', async () => {
    const { map } = createMockMap()
    const mock = createMockSGMapLib(map)
    window.SGMap = mock.lib

    await loadSGMap({ appkey: 'app-key', appsecret: 'app-secret', plugins: ['SGMap.ConvertTask'] })

    expect(findScript()).toBeNull()
    expect(mock.login).toHaveBeenCalledWith('app-key', 'app-secret')
    expect(mock.plugin).toHaveBeenCalledWith(['SGMap.ConvertTask'])
  })

  it('脚本加载失败后 reject，并允许重试', async () => {
    const { map } = createMockMap()
    const mock = createMockSGMapLib(map)

    const first = loadSGMap()
    const script = findScript()
    expect(script).not.toBeNull()

    script?.dispatchEvent(new Event('error'))
    await expect(first).rejects.toThrow('[sgmap-use] failed to load SGMap SDK')

    delete window.SGMap
    const retry = loadSGMap()
    expect(retry).not.toBe(first)

    window.SGMap = mock.lib
    findScript()?.dispatchEvent(new Event('load'))

    await expect(retry).resolves.toBe(mock.lib)
  })
})
