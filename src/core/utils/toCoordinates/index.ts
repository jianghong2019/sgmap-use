import { normalizeLngLat, type MaybeLngLat } from '~shared/coordinate'
import type { Position } from '~types/sgmap'

/**
 * 把经纬度输入转换为 GeoJSON 坐标数组（`[lng, lat]` / `[lng, lat, alt]`）。
 *
 * @example
 * ```ts
 * toCoordinates({ lng: 116.39, lat: 39.9 }) // [116.39, 39.9]
 * ```
 */
export function toCoordinates(source: MaybeLngLat): Position {
  const { lng, lat, alt } = normalizeLngLat(source)
  return alt === undefined ? [lng, lat] : [lng, lat, alt]
}
