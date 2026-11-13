/**
 * 思极地图 SDK（Mapbox GL 风格）的最小结构化类型声明。
 *
 * 只声明本库实际用到的能力，不复制 SDK 的完整类型；
 * 通过 `window.SGMap` 访问命名空间，避免声明全局 `const SGMap`
 * 与使用方自带的 SDK 类型产生冲突。
 */

export interface SgLngLatLike {
  lng: number
  lat: number
  alt?: number
}

export interface SgLngLat extends SgLngLatLike {
  toArray?: () => [number, number] | [number, number, number]
  wrap?: () => SgLngLat
}

export type LngLatLike = SgLngLatLike | [number, number] | [number, number, number]

export interface SgPointLike {
  x: number
  y: number
}

export type PointLike = SgPointLike | [number, number]

/** GeoJSON 坐标（`[经度, 纬度]` 或 `[经度, 纬度, 高程]`）。 */
export type Position = number[]

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: Position
}

export interface GeoJSONMultiPoint {
  type: 'MultiPoint'
  coordinates: Position[]
}

export interface GeoJSONLineString {
  type: 'LineString'
  coordinates: Position[]
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString'
  coordinates: Position[][]
}

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: Position[][]
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: Position[][][]
}

export interface GeoJSONGeometryCollection {
  type: 'GeometryCollection'
  geometries: GeoJSONGeometry[]
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONMultiPoint
  | GeoJSONLineString
  | GeoJSONMultiLineString
  | GeoJSONPolygon
  | GeoJSONMultiPolygon
  | GeoJSONGeometryCollection

export interface GeoJSONFeature<
  G extends GeoJSONGeometry = GeoJSONGeometry,
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type: 'Feature'
  id?: string | number
  geometry: G
  properties: P
}

export interface GeoJSONFeatureCollection<
  G extends GeoJSONGeometry = GeoJSONGeometry,
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type: 'FeatureCollection'
  features: Array<GeoJSONFeature<G, P>>
}

export type GeoJSONData =
  | GeoJSONGeometry
  | GeoJSONFeature
  | GeoJSONFeatureCollection

export interface GeoJSONSourceSpecification {
  type: 'geojson'
  data: GeoJSONData
  cluster?: boolean
  clusterRadius?: number
  clusterMaxZoom?: number
  generateId?: boolean
  [key: string]: unknown
}

export type SourceSpecification = GeoJSONSourceSpecification | Record<string, unknown>

export interface SgGeoJSONSource {
  setData: (data: GeoJSONData) => SgGeoJSONSource
  getClusterExpansionZoom?: (clusterId: number, callback: (error: Error | null, zoom: number) => void) => void
  [key: string]: unknown
}

export type PaintSpecification = Record<string, unknown>
export type LayoutSpecification = Record<string, unknown>
export type FilterSpecification = unknown[]

export interface LayerSpecification {
  id: string
  type: string
  source?: string | SourceSpecification
  'source-layer'?: string
  paint?: PaintSpecification
  layout?: LayoutSpecification
  filter?: FilterSpecification
  minzoom?: number
  maxzoom?: number
  metadata?: Record<string, unknown>
}

/** 传给 `map.on/off/once` 的事件对象（只列出常用字段）。 */
export interface MapEvent {
  type: string
  target: SgMapInstance
  originalEvent?: Event
  [key: string]: unknown
}

export interface MapMouseEvent extends MapEvent {
  lngLat: SgLngLat
  point: SgPointLike
  features?: Array<GeoJSONFeature>
}

export interface StyleImageMissingEvent extends MapEvent {
  id: string
}

export interface FeatureStateTarget {
  source: string
  id?: string | number
  sourceLayer?: string
}

export interface SgPopupOptions {
  closeButton?: boolean
  closeOnClick?: boolean
  closeOnMove?: boolean
  anchor?: string
  offset?: [number, number] | Record<string, unknown>
  maxWidth?: string
  className?: string
}

export interface SgPopupInstance {
  addTo: (map: SgMapInstance) => SgPopupInstance
  remove: () => SgPopupInstance
  isOpen: () => boolean
  setLngLat: (lnglat: LngLatLike) => SgPopupInstance
  getLngLat: () => SgLngLat
  setHTML: (html: string) => SgPopupInstance
  setText: (text: string) => SgPopupInstance
  setDOMContent: (node: Node) => SgPopupInstance
  setMaxWidth: (width: string) => SgPopupInstance
  setOffset: (offset: SgPopupOptions['offset']) => SgPopupInstance
  on: (type: string, listener: (...args: unknown[]) => void) => SgPopupInstance
  off: (type: string, listener: (...args: unknown[]) => void) => SgPopupInstance
}

export interface SgPopupConstructor {
  new (options?: SgPopupOptions): SgPopupInstance
}

export interface SgMarkerOptions {
  element?: HTMLElement
  anchor?: string
  offset?: [number, number]
  color?: string
  draggable?: boolean
  rotation?: number
  pitchAlignment?: string
  rotationAlignment?: string
}

export interface SgMarkerInstance {
  addTo: (map: SgMapInstance) => SgMarkerInstance
  remove: () => SgMarkerInstance
  setLngLat: (lnglat: LngLatLike) => SgMarkerInstance
  getLngLat: () => SgLngLat
  setDraggable: (value: boolean) => SgMarkerInstance
  isDraggable: () => boolean
  setElement: (element: HTMLElement) => SgMarkerInstance
  getElement: () => HTMLElement
  on: (type: string, listener: (...args: unknown[]) => void) => SgMarkerInstance
  off: (type: string, listener: (...args: unknown[]) => void) => SgMarkerInstance
}

export interface SgMarkerConstructor {
  new (options?: SgMarkerOptions): SgMarkerInstance
}

export type MapEventListener = (event: MapEvent & Record<string, unknown>) => void

/**
 * 地图实例的结构化子集。
 *
 * 方法签名刻意保持宽松（`unknown` / `Record<string, unknown>`），
 * 以免与 SDK 的实际重载产生不兼容。
 */
export interface SgMapInstance {
  on: {
    <E extends MapEvent>(type: string, listener: (event: E) => void): SgMapInstance
    <E extends MapEvent>(type: string, layerId: string, listener: (event: E) => void): SgMapInstance
  }
  off: {
    <E extends MapEvent>(type: string, listener: (event: E) => void): SgMapInstance
    <E extends MapEvent>(type: string, layerId: string, listener: (event: E) => void): SgMapInstance
  }
  once: {
    <E extends MapEvent>(type: string, listener: (event: E) => void): SgMapInstance
    <E extends MapEvent>(type: string, layerId: string, listener: (event: E) => void): SgMapInstance
  }

  getCanvas: () => HTMLCanvasElement
  getContainer: () => HTMLElement
  resize: () => SgMapInstance
  remove?: () => void
  /** 请求重绘一帧；用于在地图空闲时主动触发 render / idle。 */
  triggerRepaint?: () => void

  project: (lnglat: LngLatLike) => SgPointLike
  unproject: (point: PointLike) => SgLngLat

  getCenter: () => SgLngLat
  getZoom: () => number
  getBounds?: () => unknown
  isStyleLoaded: () => boolean
  loaded?: () => boolean

  addSource: (id: string, source: SourceSpecification) => SgMapInstance
  getSource: <T = SgGeoJSONSource>(id: string) => T | undefined
  removeSource: (id: string) => SgMapInstance
  isSourceLoaded?: (id: string) => boolean

  addLayer: (layer: LayerSpecification, beforeId?: string) => SgMapInstance
  getLayer: (id: string) => LayerSpecification | undefined
  removeLayer: (id: string) => SgMapInstance
  moveLayer: (id: string, beforeId?: string) => SgMapInstance
  setPaintProperty: (layerId: string, name: string, value: unknown) => SgMapInstance
  getPaintProperty: (layerId: string, name: string) => unknown
  setLayoutProperty: (layerId: string, name: string, value: unknown) => SgMapInstance
  getLayoutProperty: (layerId: string, name: string) => unknown
  setFilter: (layerId: string, filter?: FilterSpecification | null) => SgMapInstance

  queryRenderedFeatures: (
    geometry?: PointLike | [PointLike, PointLike],
    options?: { layers?: string[]; filter?: FilterSpecification },
  ) => GeoJSONFeature[]
  querySourceFeatures: (
    sourceId: string,
    parameters?: { sourceLayer?: string; filter?: FilterSpecification },
  ) => GeoJSONFeature[]

  setFeatureState: (target: FeatureStateTarget, state: Record<string, unknown>) => void
  getFeatureState: (target: FeatureStateTarget) => Record<string, unknown>
  removeFeatureState: (target: FeatureStateTarget, key?: string) => void

  loadImage: (
    url: string,
    callback: (error: Error | null, image?: CanvasImageSource & { width: number; height: number }) => void,
  ) => void
  hasImage: (id: string) => boolean
  addImage: (id: string, image: unknown, options?: { pixelRatio?: number; sdf?: boolean }) => SgMapInstance
  removeImage: (id: string) => SgMapInstance

  flyTo: (options: Record<string, unknown>) => SgMapInstance
  easeTo: (options: Record<string, unknown>) => SgMapInstance
  jumpTo?: (options: Record<string, unknown>) => SgMapInstance
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: Record<string, unknown>,
  ) => SgMapInstance
  zoomTo: (zoom: number, options?: Record<string, unknown>) => SgMapInstance
  zoomIn: (options?: Record<string, unknown>) => SgMapInstance
  zoomOut: (options?: Record<string, unknown>) => SgMapInstance
  setMaxBounds: (bounds?: [[number, number], [number, number]] | null) => SgMapInstance

  setStyle?: (style: unknown, options?: Record<string, unknown>) => SgMapInstance
}

export interface SGMapNamespace {
  Map: new (options: Record<string, unknown>) => SgMapInstance
  Popup: SgPopupConstructor
  Marker: SgMarkerConstructor
  LngLat?: new (lng: number, lat: number, alt?: number) => SgLngLat
  Point?: new (x: number, y: number) => SgPointLike
  tokenTask?: {
    login: (appkey: string, appsecret: string) => Promise<unknown>
  }
  plugin?: (plugins: string[] | string) => Promise<unknown>
  [key: string]: unknown
}

declare global {
  interface Window {
    SGMap?: SGMapNamespace
  }
}
