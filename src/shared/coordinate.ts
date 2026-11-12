import type { LngLatLike } from '~types/sgmap'
import { throwError } from './errorHandler'

export interface LngLatObject {
  lng: number | string
  lat: number | string
  alt?: number | string
}

export interface LngLatLongObject {
  longitude: number | string
  latitude: number | string
  height?: number | string
}

export interface LonLatObject {
  lon: number | string
  lat: number | string
}

export interface LngLatArrayLike {
  toArray: () => Array<number | string>
}

/**
 * 所有被接受的经纬度输入形态。
 * 经度在前、纬度在后，与 GeoJSON / 思极地图保持一致。
 */
export type MaybeLngLat =
  | LngLatLike
  | readonly [number | string, number | string]
  | readonly [number | string, number | string, number | string]
  | LngLatObject
  | LngLatLongObject
  | LonLatObject
  | LngLatArrayLike

export interface NormalizedLngLat {
  lng: number
  lat: number
  alt?: number
}

/**
 * 把任意受支持的经纬度输入归一化为 `{ lng, lat, alt? }`。
 *
 * 只做「输入归一化」，不做坐标转换（WGS84 ↔ GCJ-02 请用 SDK 的 ConvertTask）。
 */
export function normalizeLngLat(source: MaybeLngLat): NormalizedLngLat {
  const value = source as unknown

  if (value === null || value === undefined) {
    throwError('invalid lnglat: expected an array or object')
  }

  let lng: unknown
  let lat: unknown
  let alt: unknown

  if (Array.isArray(value)) {
    lng = value[0]
    lat = value[1]
    alt = value[2]
  } else {
    const object = value as Record<string, unknown>
    if (typeof object.toArray === 'function') {
      const array = (object.toArray as () => unknown[])()
      lng = array[0]
      lat = array[1]
      alt = array[2]
    } else if (object.longitude !== undefined || object.latitude !== undefined) {
      lng = object.longitude
      lat = object.latitude
      alt = object.height
    } else if (object.lon !== undefined) {
      lng = object.lon
      lat = object.lat
      alt = object.alt
    } else {
      lng = object.lng
      lat = object.lat
      alt = object.alt
    }
  }

  const normalizedLng = toFiniteNumber(lng)
  const normalizedLat = toFiniteNumber(lat)

  if (normalizedLng === undefined || normalizedLat === undefined) {
    throwError(`invalid lnglat: ${String(lng)}, ${String(lat)}`)
  }

  const result: NormalizedLngLat = { lng: normalizedLng, lat: normalizedLat }

  const normalizedAlt = toFiniteNumber(alt)
  if (normalizedAlt !== undefined) result.alt = normalizedAlt

  return result
}

/**
 * 严格数值转换：拒绝 `''`、`null`、布尔值等会被 `Number()` 隐式转成 0 的输入。
 */
function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}
