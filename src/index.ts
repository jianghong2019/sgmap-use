export * from './types/sgmap'
export * from './shared/errorHandler'
export * from './shared/coordinate'
export * from './shared/geo'
export * from './shared/sdk'

export {
  loadSGMap,
  resetLoadSGMap,
  DEFAULT_SG_MAP_SRC,
  type LoadSGMapOptions,
} from './core/utils/loadSGMap'
export { toLngLat } from './core/utils/toLngLat'
export { toCoordinates } from './core/utils/toCoordinates'
export { toBounds, type BoundsLike, type BoundsObject, type BoundsTuple } from './core/utils/toBounds'
export { getGeoJSONBounds } from './core/utils/getGeoJSONBounds'

export {
  useMapProvider,
  onMapReady,
  waitForMapLoad,
  MAP_CONTEXT_KEY,
  type MapContext,
  type UseMapProviderOptions,
} from './core/composables/useMapProvider'
export { useMap, useMapContext, useMapReady } from './core/composables/useMap'
export { useMapEvent, type UseMapEventOptions } from './core/composables/useMapEvent'
export {
  useMapIdle,
  type UseMapIdleOptions,
  type UseMapIdleReturn,
} from './core/composables/useMapIdle'
export {
  useViewportFeatures,
  type UseViewportFeaturesOptions,
  type UseViewportFeaturesReturn,
} from './core/composables/useViewportFeatures'
export { useMapClick, type MapClickEvent, type UseMapClickOptions } from './core/composables/useMapClick'
export { usePointerLngLat, type UsePointerLngLatOptions } from './core/composables/usePointerLngLat'
export {
  useMapView,
  type MapViewFitBoundsOptions,
  type MapViewFlyOptions,
  type MapViewZoomOptions,
  type UseMapViewOptions,
  type UseMapViewReturn,
} from './core/composables/useMapView'
export {
  useGeoJSONSource,
  type UseGeoJSONSourceOptions,
  type UseGeoJSONSourceReturn,
} from './core/composables/useGeoJSONSource'
export { useLayer, type UseLayerOptions, type UseLayerReturn } from './core/composables/useLayer'
export {
  useGeoJSONLayer,
  type ClusterOptions,
  type UseGeoJSONLayerOptions,
  type UseGeoJSONLayerReturn,
} from './core/composables/useGeoJSONLayer'
export { useFeatureState, type UseFeatureStateReturn } from './core/composables/useFeatureState'
export { usePopup, type UsePopupOptions, type UsePopupReturn } from './core/composables/usePopup'
export { useMarker, type UseMarkerReturn } from './core/composables/useMarker'
export {
  useMapImage,
  useStyleImageMissing,
  type StyleImageResolver,
  type UseMapImageOptions,
  type UseMapImageReturn,
} from './core/composables/useMapImage'
export {
  useLocated,
  type LocatedPlacement,
  type UseLocatedOptions,
  type UseLocatedReturn,
} from './core/composables/useLocated'

export { default as SgMap } from './core/components/SgMap/index.vue'
export { default as Located } from './core/components/Located/index.vue'
