import type { GeoJSONData } from '~types/sgmap'

export interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

/** 判断一个值是否看起来像 GeoJSON 对象。 */
export function isGeoJSON(value: unknown): value is GeoJSONData {
  if (!value || typeof value !== 'object') return false
  const type = (value as { type?: unknown }).type
  return typeof type === 'string'
}

/**
 * 递归计算 GeoJSON 的经纬度包围盒。
 * 没有任何有效坐标时返回 `undefined`。
 */
export function computeGeoJSONBounds(data: GeoJSONData | null | undefined): Bounds | undefined {
  if (!data) return undefined

  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  visitNode(data, box)

  if (!Number.isFinite(box[0]) || !Number.isFinite(box[1])) return undefined

  return { west: box[0], south: box[1], east: box[2], north: box[3] }
}

function visitNode(node: unknown, box: [number, number, number, number]): void {
  if (!node || typeof node !== 'object') return

  const value = node as Record<string, unknown>

  switch (value.type) {
    case 'FeatureCollection':
      for (const feature of (value.features as unknown[]) ?? []) visitNode(feature, box)
      return
    case 'Feature':
      visitNode(value.geometry, box)
      return
    case 'GeometryCollection':
      for (const geometry of (value.geometries as unknown[]) ?? []) visitNode(geometry, box)
      return
    default:
      if (value.coordinates !== undefined) visitCoordinates(value.coordinates, box)
  }
}

function visitCoordinates(coordinates: unknown, box: [number, number, number, number]): void {
  if (!Array.isArray(coordinates)) return

  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    const lng = coordinates[0]
    const lat = coordinates[1]

    if (lng < box[0]) box[0] = lng
    if (lat < box[1]) box[1] = lat
    if (lng > box[2]) box[2] = lng
    if (lat > box[3]) box[3] = lat
    return
  }

  for (const child of coordinates) visitCoordinates(child, box)
}
