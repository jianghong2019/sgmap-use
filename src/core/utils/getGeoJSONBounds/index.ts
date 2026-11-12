import type { ErrorMode } from '~shared/errorHandler'
import { handleError } from '~shared/errorHandler'
import { computeGeoJSONBounds, type Bounds } from '~shared/geo'
import type { GeoJSONData } from '~types/sgmap'

/**
 * 计算 GeoJSON 的经纬度包围盒。
 *
 * @param data GeoJSON 对象
 * @param mode 无有效坐标时的错误策略，默认静默并返回 `undefined`
 */
export function getGeoJSONBounds(
  data: GeoJSONData | null | undefined,
  mode: ErrorMode = 'silent',
): Bounds | undefined {
  const bounds = computeGeoJSONBounds(data)

  if (!bounds) {
    handleError(mode, 'no valid coordinates in GeoJSON')
    return undefined
  }

  return bounds
}
