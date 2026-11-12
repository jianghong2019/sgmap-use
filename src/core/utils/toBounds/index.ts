import { normalizeLngLat, type MaybeLngLat } from '~shared/coordinate'
import { throwError } from '~shared/errorHandler'

/** `[[west, south], [east, north]]` */
export type BoundsTuple = [[number, number], [number, number]]

export interface BoundsObject {
  west: number
  south: number
  east: number
  north: number
}

export type BoundsLike =
  | readonly [MaybeLngLat, MaybeLngLat]
  | BoundsObject
  | { _sw: MaybeLngLat; _ne: MaybeLngLat }
  | { getSouthWest: () => MaybeLngLat; getNorthEast: () => MaybeLngLat }
  | { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number }

/**
 * 把多种「范围」输入归一化为 Mapbox 的 `[[west, south], [east, north]]`。
 *
 * 支持：`[[sw], [ne]]`、`{ west, south, east, north }`、
 * SDK `LngLatBounds`（`_sw/_ne` 或 `getSouthWest()/getNorthEast()`）。
 */
export function toBounds(source: BoundsLike): BoundsTuple {
  const value = source as unknown

  if (Array.isArray(value)) {
    if (value.length === 2 && isCorner(value[0]) && isCorner(value[1])) {
      const southWest = normalizeLngLat(value[0] as MaybeLngLat)
      const northEast = normalizeLngLat(value[1] as MaybeLngLat)
      return [
        [southWest.lng, southWest.lat],
        [northEast.lng, northEast.lat],
      ]
    }
  } else if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>

    if (typeof object.getSouthWest === 'function' && typeof object.getNorthEast === 'function') {
      const southWest = normalizeLngLat((object.getSouthWest as () => MaybeLngLat)())
      const northEast = normalizeLngLat((object.getNorthEast as () => MaybeLngLat)())
      return [
        [southWest.lng, southWest.lat],
        [northEast.lng, northEast.lat],
      ]
    }

    if (typeof object.getWest === 'function' && typeof object.getSouth === 'function') {
      return [
        [Number((object.getWest as () => number)()), Number((object.getSouth as () => number)())],
        [Number((object.getEast as () => number)()), Number((object.getNorth as () => number)())],
      ]
    }

    if (object._sw !== undefined && object._ne !== undefined) {
      const southWest = normalizeLngLat(object._sw as MaybeLngLat)
      const northEast = normalizeLngLat(object._ne as MaybeLngLat)
      return [
        [southWest.lng, southWest.lat],
        [northEast.lng, northEast.lat],
      ]
    }

    if (
      object.west !== undefined &&
      object.south !== undefined &&
      object.east !== undefined &&
      object.north !== undefined
    ) {
      const west = Number(object.west)
      const south = Number(object.south)
      const east = Number(object.east)
      const north = Number(object.north)
      if ([west, south, east, north].every(Number.isFinite)) {
        return [
          [west, south],
          [east, north],
        ]
      }
    }
  }

  throwError('invalid bounds: expected [[lng, lat], [lng, lat]] or a bounds-like object')
}

function isCorner(value: unknown): boolean {
  return Array.isArray(value) || (typeof value === 'object' && value !== null)
}
