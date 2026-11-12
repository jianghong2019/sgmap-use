import { useMapContext } from '~composables/useMap'
import { handleError, type ErrorMode } from '~shared/errorHandler'
import type { MaybeLngLat } from '~shared/coordinate'
import type { BoundsTuple, BoundsLike } from '~utils/toBounds'
import { toBounds } from '~utils/toBounds'
import { toLngLat } from '~utils/toLngLat'
import type { SgLngLat, SgMapInstance } from '~types/sgmap'

export interface MapViewFlyOptions {
  center?: MaybeLngLat
  zoom?: number
  [key: string]: unknown
}

export interface MapViewFitBoundsOptions {
  padding?: number
  [key: string]: unknown
}

export interface MapViewZoomOptions {
  duration?: number
  [key: string]: unknown
}

export interface UseMapViewOptions {
  /** 地图未就绪时的错误策略，默认 `'no-throw-error'`。 */
  mode?: ErrorMode
}

export interface UseMapViewReturn {
  flyTo: (options?: MapViewFlyOptions) => void
  easeTo: (options?: MapViewFlyOptions) => void
  fitBounds: (bounds: BoundsLike, options?: MapViewFitBoundsOptions) => void
  zoomTo: (zoom: number, options?: MapViewZoomOptions) => void
  zoomIn: (options?: MapViewZoomOptions) => void
  zoomOut: (options?: MapViewZoomOptions) => void
  getCenter: () => SgLngLat | undefined
  getZoom: () => number | undefined
  setMaxBounds: (bounds: BoundsLike | null) => void
}

/**
 * 常用视图操作，坐标参数接受 `toLngLat` 支持的所有输入格式。
 *
 * @example
 * ```ts
 * const { flyTo, fitBounds } = useMapView()
 * flyTo({ center: [116.39, 39.9], zoom: 12 })
 * fitBounds([[116.1, 39.7], [116.7, 40.1]], { padding: 50 })
 * ```
 */
export function useMapView(options: UseMapViewOptions = {}): UseMapViewReturn {
  const context = useMapContext()
  const mode = options.mode ?? 'no-throw-error'

  const withMap = (callback: (map: SgMapInstance) => void) => {
    const map = context?.map.value
    if (!map) {
      handleError(mode, 'map is undefined')
      return
    }
    callback(map)
  }

  const flyTo = (flyOptions: MapViewFlyOptions = {}) => {
    withMap((map) => {
      const { center, ...rest } = flyOptions
      map.flyTo(center === undefined ? rest : { ...rest, center: toLngLat(center) })
    })
  }

  const easeTo = (easeOptions: MapViewFlyOptions = {}) => {
    withMap((map) => {
      const { center, ...rest } = easeOptions
      map.easeTo(center === undefined ? rest : { ...rest, center: toLngLat(center) })
    })
  }

  const fitBounds = (bounds: BoundsLike, fitOptions: MapViewFitBoundsOptions = {}) => {
    withMap((map) => {
      map.fitBounds(toBounds(bounds), fitOptions)
    })
  }

  const zoomTo = (zoom: number, zoomOptions: MapViewZoomOptions = {}) => {
    withMap((map) => {
      map.zoomTo(zoom, zoomOptions)
    })
  }

  const zoomIn = (zoomOptions: MapViewZoomOptions = {}) => {
    withMap((map) => {
      map.zoomIn(zoomOptions)
    })
  }

  const zoomOut = (zoomOptions: MapViewZoomOptions = {}) => {
    withMap((map) => {
      map.zoomOut(zoomOptions)
    })
  }

  const getCenter = (): SgLngLat | undefined => context?.map.value?.getCenter()

  const getZoom = (): number | undefined => context?.map.value?.getZoom()

  const setMaxBounds = (bounds: BoundsLike | null) => {
    withMap((map) => {
      map.setMaxBounds(bounds === null ? null : (toBounds(bounds) as BoundsTuple))
    })
  }

  return { flyTo, easeTo, fitBounds, zoomTo, zoomIn, zoomOut, getCenter, getZoom, setMaxBounds }
}
