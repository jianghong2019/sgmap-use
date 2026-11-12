export interface SpecificationDiff {
  changed: Array<[string, unknown]>
  removed: string[]
}

function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/**
 * 对比两份 paint / layout 配置，返回发生变化的键。
 * 用于把响应式样式变更映射为最少的 `setPaintProperty` / `setLayoutProperty` 调用。
 */
export function diffSpecification(
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
): SpecificationDiff {
  const before = previous ?? {}
  const after = next ?? {}

  const changed: Array<[string, unknown]> = []

  for (const [key, value] of Object.entries(after)) {
    if (!isSameValue(before[key], value)) changed.push([key, value])
  }

  const removed = Object.keys(before).filter((key) => !(key in after))

  return { changed, removed }
}
