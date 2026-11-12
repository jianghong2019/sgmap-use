/** 错误分级策略。 */
export type ErrorMode = 'throw-error' | 'no-throw-error' | 'silent'

const PREFIX = '[sgmap-use]'

/** 构造带统一前缀的 Error，供 Promise 场景使用。 */
export function sgmapError(message: string): Error {
  return new Error(`${PREFIX} ${message}`)
}

/** 直接抛出带前缀的错误。 */
export function throwError(message: string): never {
  throw sgmapError(message)
}

/** 在控制台输出错误，不中断程序。 */
export function error(message: string): void {
  console.error(`${PREFIX} ${message}`)
}

/** 在控制台输出警告。 */
export function warn(message: string): void {
  console.warn(`${PREFIX} ${message}`)
}

/** 按错误模式处理一条错误信息。 */
export function handleError(mode: ErrorMode, message: string): void {
  if (mode === 'throw-error') throwError(message)
  if (mode === 'no-throw-error') error(message)
}
