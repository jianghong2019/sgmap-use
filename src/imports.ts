/**
 * `unplugin-auto-import` 入口。
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import sgmapImports from 'sgmap-use/imports'
 * AutoImport({ imports: [sgmapImports()] })
 * ```
 */
const names = [
  // 地图上下文
  'useMapProvider',
  'useMap',
  'useMapContext',
  'useMapReady',
  'onMapReady',
  'waitForMapLoad',
  // 事件
  'useMapEvent',
  'useMapIdle',
  'useViewportFeatures',
  'useMapClick',
  'usePointerLngLat',
  // 图层
  'useGeoJSONSource',
  'useLayer',
  'useGeoJSONLayer',
  'useFeatureState',
  // 覆盖物与视图
  'usePopup',
  'useMarker',
  'useMapView',
  'useMapImage',
  'useStyleImageMissing',
  'useLocated',
  // 工具
  'loadSGMap',
  'getSGMapLib',
  'normalizeLngLat',
  'toLngLat',
  'toCoordinates',
  'toBounds',
  'getGeoJSONBounds',
  'computeGeoJSONBounds',
] as const

export default function autoImport(map?: Record<string, string>) {
  return {
    'sgmap-use': names.map((name) =>
      map && map[name] ? ([name, map[name]] as [string, string]) : name,
    ),
  }
}
