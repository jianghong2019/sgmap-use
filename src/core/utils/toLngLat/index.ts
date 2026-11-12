import { normalizeLngLat, type MaybeLngLat, type NormalizedLngLat } from '~shared/coordinate'

/**
 * 把任意受支持的经纬度输入转换为 `{ lng, lat }`。
 * 返回结构在 Mapbox / 思极地图中可直接作为 `LngLatLike` 使用。
 *
 * @example
 * ```ts
 * toLngLat([116.39, 39.9])            // { lng: 116.39, lat: 39.9 }
 * toLngLat({ longitude: 116, latitude: 39 })
 * ```
 */
export function toLngLat(source: MaybeLngLat): NormalizedLngLat {
  return normalizeLngLat(source)
}
