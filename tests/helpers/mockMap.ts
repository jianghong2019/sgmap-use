import { vi } from 'vitest'
import type {
  SgMapInstance,
  SgMarkerInstance,
  SgPopupInstance,
  SGMapNamespace,
} from '~types/sgmap'

export interface MockMap {
  map: SgMapInstance
  emit: (type: string, event?: Record<string, unknown>) => void
  layers: Map<string, unknown>
  sources: Map<string, { setData: ReturnType<typeof vi.fn> }>
  images: Set<string>
  setStyleLoaded: (loaded: boolean) => void
}

export function createMockMap(options: { loaded?: boolean } = {}): MockMap {
  let styleLoaded = options.loaded ?? true
  const listeners = new Map<string, Set<(event: unknown) => void>>()
  const layers = new Map<string, unknown>()
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const images = new Set<string>()

  const addListener = (type: string, listener: (event: unknown) => void) => {
    const set = listeners.get(type) ?? new Set()
    set.add(listener)
    listeners.set(type, set)
  }

  const removeListener = (type: string, listener: (event: unknown) => void) => {
    listeners.get(type)?.delete(listener)
  }

  const pick = (args: unknown[]) => {
    const listener = args.find((arg) => typeof arg === 'function') as
      | ((event: unknown) => void)
      | undefined
    if (listener) addListener(args[0] as string, listener)
  }

  const map = {
    on: vi.fn((...args: unknown[]) => {
      pick(args)
      return map
    }),
    off: vi.fn((...args: unknown[]) => {
      const listener = args.find((arg) => typeof arg === 'function') as
        | ((event: unknown) => void)
        | undefined
      if (listener) removeListener(args[0] as string, listener)
      return map
    }),
    once: vi.fn((...args: unknown[]) => {
      const listener = args.find((arg) => typeof arg === 'function') as
        | ((event: unknown) => void)
        | undefined
      if (listener) {
        const wrapped = (event: unknown) => {
          removeListener(args[0] as string, wrapped)
          listener(event)
        }
        addListener(args[0] as string, wrapped)
      }
      return map
    }),
    getCanvas: () => document.createElement('canvas'),
    getContainer: () => document.createElement('div'),
    resize: vi.fn(() => map),
    remove: vi.fn(),
    triggerRepaint: vi.fn(),
    project: vi.fn((lnglat: { lng: number; lat: number }) => ({ x: lnglat.lng * 10, y: lnglat.lat * 10 })),
    unproject: vi.fn((point: { x: number; y: number }) => ({ lng: point.x / 10, lat: point.y / 10 })),
    getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
    getZoom: vi.fn(() => 10),
    getBounds: vi.fn(() => ({})),
    isStyleLoaded: vi.fn(() => styleLoaded),
    loaded: vi.fn(() => styleLoaded),
    addSource: vi.fn((id: string, source: Record<string, unknown>) => {
      sources.set(id, { ...source, setData: vi.fn() })
      return map
    }),
    getSource: vi.fn((id: string) => sources.get(id)),
    removeSource: vi.fn((id: string) => {
      sources.delete(id)
      return map
    }),
    isSourceLoaded: vi.fn(() => true),
    addLayer: vi.fn((layer: { id: string }) => {
      layers.set(layer.id, layer)
      return map
    }),
    getLayer: vi.fn((id: string) => layers.get(id)),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id)
      return map
    }),
    moveLayer: vi.fn(() => map),
    setPaintProperty: vi.fn(() => map),
    getPaintProperty: vi.fn(() => undefined),
    setLayoutProperty: vi.fn(() => map),
    getLayoutProperty: vi.fn(() => undefined),
    setFilter: vi.fn(() => map),
    queryRenderedFeatures: vi.fn(() => []),
    querySourceFeatures: vi.fn(() => []),
    setFeatureState: vi.fn(),
    getFeatureState: vi.fn(() => ({})),
    removeFeatureState: vi.fn(),
    loadImage: vi.fn((_url: string, callback: (error: Error | null, image?: unknown) => void) => {
      callback(null, { width: 1, height: 1 })
    }),
    hasImage: vi.fn((id: string) => images.has(id)),
    addImage: vi.fn((id: string) => {
      images.add(id)
      return map
    }),
    removeImage: vi.fn((id: string) => {
      images.delete(id)
      return map
    }),
    flyTo: vi.fn(() => map),
    easeTo: vi.fn(() => map),
    jumpTo: vi.fn(() => map),
    fitBounds: vi.fn(() => map),
    zoomTo: vi.fn(() => map),
    zoomIn: vi.fn(() => map),
    zoomOut: vi.fn(() => map),
    setMaxBounds: vi.fn(() => map),
    setStyle: vi.fn(() => map),
  }

  return {
    map: map as unknown as SgMapInstance,
    emit: (type: string, event: Record<string, unknown> = {}) => {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener({ type, target: map, ...event })
      }
    },
    layers,
    sources,
    images,
    setStyleLoaded: (loaded: boolean) => {
      styleLoaded = loaded
    },
  }
}

export function createMockPopup(): SgPopupInstance {
  const popup = {
    addTo: vi.fn(() => popup),
    remove: vi.fn(() => popup),
    isOpen: vi.fn(() => false),
    setLngLat: vi.fn(() => popup),
    getLngLat: vi.fn(() => ({ lng: 0, lat: 0 })),
    setHTML: vi.fn(() => popup),
    setText: vi.fn(() => popup),
    setDOMContent: vi.fn(() => popup),
    setMaxWidth: vi.fn(() => popup),
    setOffset: vi.fn(() => popup),
    on: vi.fn(() => popup),
    off: vi.fn(() => popup),
  }
  return popup as unknown as SgPopupInstance
}

export function createMockMarker(): SgMarkerInstance {
  const marker = {
    addTo: vi.fn(() => marker),
    remove: vi.fn(() => marker),
    setLngLat: vi.fn(() => marker),
    getLngLat: vi.fn(() => ({ lng: 0, lat: 0 })),
    setDraggable: vi.fn(() => marker),
    isDraggable: vi.fn(() => false),
    setElement: vi.fn(() => marker),
    getElement: vi.fn(() => document.createElement('div')),
    on: vi.fn(() => marker),
    off: vi.fn(() => marker),
  }
  return marker as unknown as SgMarkerInstance
}

export interface MockSGMapLib {
  lib: SGMapNamespace
  Map: ReturnType<typeof vi.fn>
  Popup: ReturnType<typeof vi.fn>
  Marker: ReturnType<typeof vi.fn>
  popup: SgPopupInstance
  marker: SgMarkerInstance
  login: ReturnType<typeof vi.fn>
  plugin: ReturnType<typeof vi.fn>
}

export function createMockSGMapLib(map: SgMapInstance): MockSGMapLib {
  const popup = createMockPopup()
  const marker = createMockMarker()
  const login = vi.fn(() => Promise.resolve())
  const plugin = vi.fn(() => Promise.resolve())

  const Map = vi.fn(function () {
    return map
  })
  const Popup = vi.fn(function () {
    return popup
  })
  const Marker = vi.fn(function () {
    return marker
  })

  const lib = {
    Map,
    Popup,
    Marker,
    tokenTask: { login },
    plugin,
  } as unknown as SGMapNamespace

  return { lib, Map, Popup, Marker, popup, marker, login, plugin }
}
