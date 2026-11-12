import type { SGMapNamespace } from '~types/sgmap'
import { throwError } from './errorHandler'

let current: SGMapNamespace | undefined

/** 记录已加载的 SDK 命名空间（由 `loadSGMap` 调用）。 */
export function setSGMapLib(lib: SGMapNamespace): void {
  current = lib
}

/** SDK 是否已经就绪。 */
export function hasSGMapLib(): boolean {
  return current !== undefined
}

/** 获取 SDK 命名空间；未加载时抛错。 */
export function getSGMapLib(): SGMapNamespace {
  if (!current) {
    throwError('SGMap SDK is not loaded, call loadSGMap() first')
  }
  return current
}

/** 清空 SDK 记录（仅用于测试或热重载）。 */
export function resetSGMapLib(): void {
  current = undefined
}
