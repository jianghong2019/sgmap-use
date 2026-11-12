import { describe, expect, it } from 'vitest'
import { normalizeLngLat } from '~shared/coordinate'
import { computeGeoJSONBounds } from '~shared/geo'
import { toBounds } from '~utils/toBounds'
import { toCoordinates } from '~utils/toCoordinates'
import { getGeoJSONBounds } from '~utils/getGeoJSONBounds'
import { toLngLat } from '~utils/toLngLat'

describe('坐标归一化', () => {
  it('接受数组、对象、经纬度全称与 SDK LngLat', () => {
    expect(normalizeLngLat([116, 39])).toEqual({ lng: 116, lat: 39 })
    expect(normalizeLngLat([116, 39, 100])).toEqual({ lng: 116, lat: 39, alt: 100 })
    expect(normalizeLngLat({ lng: 116, lat: 39 })).toEqual({ lng: 116, lat: 39 })
    expect(normalizeLngLat({ longitude: '116', latitude: '39' })).toEqual({ lng: 116, lat: 39 })
    expect(normalizeLngLat({ lon: 116, lat: 39 })).toEqual({ lng: 116, lat: 39 })
    expect(normalizeLngLat({ toArray: () => [116, 39] })).toEqual({ lng: 116, lat: 39 })
  })

  it('对非法输入抛出带前缀的错误', () => {
    expect(() => normalizeLngLat(null as never)).toThrow('[sgmap-use]')
    expect(() => normalizeLngLat({ lng: 'a', lat: 39 } as never)).toThrow('invalid lnglat')
    expect(() => normalizeLngLat({ foo: 1 } as never)).toThrow('invalid lnglat')
    expect(() => normalizeLngLat(['', 39] as never)).toThrow('invalid lnglat')
    expect(() => normalizeLngLat({ lng: null, lat: 39 } as never)).toThrow('invalid lnglat')
  })

  it('toLngLat 与 toCoordinates 返回预期结构', () => {
    expect(toLngLat({ longitude: 116, latitude: 39 })).toEqual({ lng: 116, lat: 39 })
    expect(toCoordinates([116, 39])).toEqual([116, 39])
    expect(toCoordinates([116, 39, 12])).toEqual([116, 39, 12])
  })
})

describe('toBounds', () => {
  it('支持角点数组', () => {
    expect(toBounds([[116, 39], [117, 40]])).toEqual([
      [116, 39],
      [117, 40],
    ])
  })

  it('支持四至对象与 SDK 内部结构', () => {
    expect(toBounds({ west: 116, south: 39, east: 117, north: 40 })).toEqual([
      [116, 39],
      [117, 40],
    ])
    expect(toBounds({ _sw: { lng: 116, lat: 39 }, _ne: { lng: 117, lat: 40 } })).toEqual([
      [116, 39],
      [117, 40],
    ])
    expect(
      toBounds({
        getSouthWest: () => [116, 39] as [number, number],
        getNorthEast: () => [117, 40] as [number, number],
      }),
    ).toEqual([
      [116, 39],
      [117, 40],
    ])
  })

  it('非法输入抛出错误', () => {
    expect(() => toBounds([1, 2] as never)).toThrow('[sgmap-use]')
    expect(() => toBounds({} as never)).toThrow('invalid bounds')
  })
})

describe('GeoJSON 包围盒', () => {
  const polygon = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [116, 39],
          [118, 39],
          [118, 41],
          [116, 41],
          [116, 39],
        ],
      ],
    },
  }

  it('计算 Feature 的 bbox', () => {
    expect(computeGeoJSONBounds(polygon)).toEqual({ west: 116, south: 39, east: 118, north: 41 })
  })

  it('计算 FeatureCollection 与 MultiPolygon', () => {
    expect(
      getGeoJSONBounds({
        type: 'FeatureCollection',
        features: [polygon],
      }),
    ).toEqual({ west: 116, south: 39, east: 118, north: 41 })

    expect(
      computeGeoJSONBounds({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [1, 2],
              [3, 4],
              [1, 2],
            ],
          ],
        ],
      }),
    ).toEqual({ west: 1, south: 2, east: 3, north: 4 })
  })

  it('空数据返回 undefined', () => {
    expect(computeGeoJSONBounds({ type: 'FeatureCollection', features: [] })).toBeUndefined()
    expect(getGeoJSONBounds(null)).toBeUndefined()
  })
})
