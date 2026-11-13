# sgmap-use

面向 **思极地图（SGMap）** 的 Vue 3 组合式工具库。把命令式的地图 SDK 封装成响应式、自动清理、类型安全的 `useXxx` 函数，参考 `vue-use` 的设计模式。

- 基于 `provide / inject` 获取地图实例，业务组件不需要层层传参
- 事件、图层、数据源、弹窗、标记在组件卸载时自动销毁
- 图层数据、`paint` / `layout`、显隐、`filter` 支持响应式更新
- 内置 `<SgMap>` 容器组件与 `<Located>` 坐标锚定组件
- 零运行时依赖，仅要求 `vue ^3.4` 作为 peer dependency
- TypeScript 类型完整，不打包 SDK 本身

***

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [自动导入](#自动导入)
- [核心概念](#核心概念)
- [API 参考](#api-参考)
  - [SDK 加载](#sdk-加载)
  - [地图上下文](#地图上下文)
  - [坐标与几何工具](#坐标与几何工具)
  - [事件](#事件)
  - [视图控制](#视图控制)
  - [图层与数据源](#图层与数据源)
  - [要素状态](#要素状态)
  - [弹窗与标记](#弹窗与标记)
  - [图片与缺失图标](#图片与缺失图标)
  - [DOM 锚定](#dom-锚定)
  - [组件](#组件)
- [常见问题](#常见问题)
- [本地开发](#本地开发)

***

## 安装

```bash
npm i sgmap-use
```

包提供三个入口：

| 入口                    | 用途                               |
| --------------------- | -------------------------------- |
| `sgmap-use`           | 全部组合式函数、工具、组件与类型                 |
| `sgmap-use/imports`   | `unplugin-auto-import` 自动导入配置    |
| `sgmap-use/resolvers` | `unplugin-vue-components` 组件自动注册 |

***

## 快速开始

### 方式一：使用 `<SgMap>` 组件（推荐）

`<SgMap>` 会自动完成：创建容器、加载 SDK、认证、创建地图、等待 `load`、注入上下文、监听容器尺寸变化。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SgMap, Located, useMapView } from 'sgmap-use'

const position = ref<[number, number]>([116.397478, 39.903179])
const { flyTo, zoomIn } = useMapView()
</script>

<template>
  <div style="width: 100vw; height: 100vh">
    <SgMap
      :sdk="{
        appkey: '你的 appkey',
        appsecret: '你的 appsecret',
        plugins: ['SGMap.DistrictPlusTask', 'SGMap.ConvertTask'],
      }"
      :map-options="{
        center: [116.397478, 39.903179],
        zoom: 11,
        style: 'aegis://styles/aegis/Streets-v2',
      }"
      @load="(map) => console.log('地图就绪', map)"
      @error="(error) => console.error(error)"
    >
      <Located :coordinate="position">
        <div class="marker">北京</div>
      </Located>
    </SgMap>
  </div>
</template>

<style scoped>
.marker {
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
```

`<SgMap>` 的父容器必须有明确高度（组件自身为 `width/height: 100%`）。

### 方式二：手动创建地图并注入上下文

如果已有自己的地图容器组件，可以只使用组合式函数：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadSGMap, useMapProvider } from 'sgmap-use'

const container = ref<HTMLDivElement>()

const { map, isLoaded } = useMapProvider(async () => {
  const SGMap = await loadSGMap({
    appkey: '你的 appkey',
    appsecret: '你的 appsecret',
  })

  return new SGMap.Map({
    container: container.value!,
    center: [116.397478, 39.903179],
    zoom: 11,
    style: 'aegis://styles/aegis/Streets-v2',
  })
})
</script>

<template>
  <div ref="container" style="width: 100%; height: 100%">
    <!-- 后代组件可以直接使用 useMap() / useGeoJSONLayer() 等 -->
  </div>
</template>
```

> `useMapProvider` 必须在祖先组件的 `setup()` 中调用，它通过 `provide` 把上下文传给后代。

***

## 自动导入

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import sgmapImports from 'sgmap-use/imports'
import sgmapResolvers from 'sgmap-use/resolvers'

export default defineConfig({
  plugins: [
    AutoImport({
      imports: [sgmapImports()],
    }),
    Components({
      resolvers: [sgmapResolvers()],
    }),
  ],
})
```

配置后 `useMap`、`useGeoJSONLayer` 等无需显式 import，`<SgMap>`、`<Located>` 直接可用。

***

## 核心概念

### 1. 就绪时序

地图在父组件 `onMounted` 中异步创建，因此 **子组件** **`setup()`** **执行时地图通常还没就绪**。

| 方式                    | 适用场景                              |
| --------------------- | --------------------------------- |
| `useMapContext()`     | 获取 `{ map, isLoaded, ready }`，不报错 |
| `useMapReady()`       | `await` 地图就绪                      |
| `onMapReady(ctx, cb)` | 就绪后执行回调，返回值作为卸载时的清理函数             |
| `useMap(mode)`        | 在事件回调 / 已就绪场景直接取实例                |

库内所有组合式函数都通过 `onMapReady` 自动处理时序，一般不需要你手动等待。

```ts
const context = useMapContext()
if (context) {
  watch(context.isLoaded, (loaded) => {
    if (loaded) console.log('地图可用', context.map.value)
  })
}
```

### 2. 错误分级

需要地图实例的函数接受 `mode` 参数：

| 模式                           | 行为                    |
| ---------------------------- | --------------------- |
| `'throw-error'`（`useMap` 默认） | 直接抛错，尽早暴露问题           |
| `'no-throw-error'`           | `console.error`，不中断程序 |
| `'silent'`                   | 完全静默                  |

所有错误信息统一带 `[sgmap-use]` 前缀。

### 3. 自动清理

所有组合式函数都基于 Vue 的 effect scope：

- 在组件 `setup()` 中调用 → 组件卸载时自动清理
- 在 `effectScope()` 中调用 → scope 停止时清理
- 返回的 `stop()` / `remove()` 可用于提前手动清理

### 4. 资源所有权

库只删除**自己创建**的资源：

- `useGeoJSONSource`：地图上已有同 id source 时复用，卸载不删除
- `useLayer` / `useGeoJSONLayer`：同 id 图层已存在时复用，卸载不删除
- `useMapImage`：同名图片已存在时跳过，卸载不删除

这样可以安全地与业务中其他地图代码共存。

***

## API 参考

### SDK 加载

#### `loadSGMap(options?)`

加载思极地图 SDK，依次完成：脚本注入 → 认证登录 → 插件加载。返回 `Promise<SGMap 命名空间>`。

| 参数          | 类型         | 默认值                                    | 说明                                      |
| ----------- | ---------- | -------------------------------------- | --------------------------------------- |
| `src`       | `string`   | `https://map.sgcc.com.cn/maps?v=3.0.0` | SDK 脚本地址                                |
| `appkey`    | `string`   | -                                      | 与 `appsecret` 同时提供时执行 `tokenTask.login` |
| `appsecret` | `string`   | -                                      | 认证密钥                                    |
| `plugins`   | `string[]` | -                                      | 预加载插件，如 `['SGMap.DistrictPlusTask']`    |

```ts
const SGMap = await loadSGMap({
  appkey: 'xxx',
  appsecret: 'xxx',
  plugins: ['SGMap.DistrictPlusTask', 'SGMap.GeolocationTask', 'SGMap.ConvertTask'],
})
```

行为说明：

- **幂等**：并发调用共享同一个 Promise；`window.SGMap` 已存在时跳过脚本注入
- **首次调用决定参数**：`src` / `appkey` / `plugins` 以第一次调用为准
- **可重试**：脚本加载失败会 reject，并移除失败脚本，下次调用可重新加载

#### `getSGMapLib(): SGMapNamespace`

获取已加载的 SDK 命名空间；未加载时抛错。

#### `DEFAULT_SG_MAP_SRC`

默认 SDK 地址常量。

#### `resetLoadSGMap()`

重置加载状态，仅用于测试或热重载。

***

### 地图上下文

#### `useMapProvider(init, options?)`

在祖先组件中创建并提供地图实例。

```ts
const { map, isLoaded, ready } = useMapProvider(async () => {
  const SGMap = await loadSGMap({ appkey, appsecret })
  return new SGMap.Map({ container: 'map', center: [116.39, 39.9], zoom: 11 })
})
```

| 参数                    | 类型                                              | 默认值    | 说明                   |
| --------------------- | ----------------------------------------------- | ------ | -------------------- |
| `init`                | `() => SgMapInstance \| Promise<SgMapInstance>` | -      | 创建地图实例               |
| `options.waitForLoad` | `boolean`                                       | `true` | 是否等待地图 `load` 后再置为就绪 |

返回 `MapContext`：

| 字段         | 类型                                       | 说明             |
| ---------- | ---------------------------------------- | -------------- |
| `map`      | `ShallowRef<SgMapInstance \| undefined>` | 地图实例           |
| `isLoaded` | `Ref<boolean>`                           | 地图 `load` 是否完成 |
| `ready`    | `Promise<SgMapInstance>`                 | 就绪后 resolve    |

#### `useMap(mode?)`

获取当前地图实例；未就绪或缺少 Provider 时返回 `undefined`（`throw-error` 模式会抛错）。

```ts
const onMapClick = () => {
  const map = useMap('silent')
  if (map) map.flyTo({ center: [116.39, 39.9], zoom: 12 })
}
```

> 该方法在 `setup()` 阶段通常返回 `undefined`，需要等待就绪请用 `useMapReady()` 或 `onMapReady()`。

#### `useMapContext(): MapContext | undefined`

获取上下文对象，不做错误提示。

#### `useMapReady(): Promise<SgMapInstance>`

等待地图就绪，适合 `await` 使用。

```ts
const map = await useMapReady()
map.flyTo({ center: [116.39, 39.9], zoom: 12 })
```

#### `onMapReady(context, callback)`

地图就绪后执行回调；回调返回的函数会在作用域销毁时执行。

```ts
onMapReady(useMapContext(), (map) => {
  const handler = () => console.log('moveend')
  map.on('moveend', handler)

  return () => map.off('moveend', handler)
})
```

#### `waitForMapLoad(map)`

等待地图样式加载完成；已加载时立即返回。

***

### 坐标与几何工具

`toLngLat` 系列函数接受以下所有输入形式：

```ts
[116.39, 39.9]
[116.39, 39.9, 100]
{ lng: 116.39, lat: 39.9 }
{ longitude: 116.39, latitude: 39.9, height: 100 }
{ lon: 116.39, lat: 39.9 }
{ toArray: () => [116.39, 39.9] }   // SDK LngLat 对象
```

#### `toLngLat(source)`

返回 `{ lng: number, lat: number, alt?: number }`，可直接作为 `LngLatLike` 使用。

#### `normalizeLngLat(source)`

与 `toLngLat` 相同，语义上强调「输入归一化」。非法输入抛 `[sgmap-use] invalid lnglat`。

#### `toCoordinates(source)`

返回 GeoJSON 坐标数组 `[lng, lat]` 或 `[lng, lat, alt]`。

#### `toBounds(source)`

把范围输入归一化为 Mapbox 的 `[[west, south], [east, north]]`。支持：

```ts
toBounds([[116, 39], [117, 40]])
toBounds({ west: 116, south: 39, east: 117, north: 40 })
toBounds({ _sw: { lng: 116, lat: 39 }, _ne: { lng: 117, lat: 40 } })
toBounds({
  getSouthWest: () => [116, 39],
  getNorthEast: () => [117, 40],
})
```

#### `getGeoJSONBounds(data, mode?)`

计算 GeoJSON 的经纬度包围盒，返回 `{ west, south, east, north }` 或 `undefined`。

```ts
const bounds = getGeoJSONBounds(featureCollection)
// { west: 116, south: 39, east: 118, north: 41 }
```

`mode` 默认为 `'silent'`。

#### `computeGeoJSONBounds(data)`

底层实现，不做错误提示，空数据返回 `undefined`。

***

### 事件

#### `useMapEvent(type, listener, options?)`

监听地图事件，卸载时自动 `map.off`。返回手动停止函数。

| 参数                | 类型                | 说明                                 |
| ----------------- | ----------------- | ---------------------------------- |
| `type`            | `string`          | 事件类型，如 `click`、`moveend`、`zoomend` |
| `listener`        | `(event) => void` | 事件回调                               |
| `options.layerId` | `string`          | 仅在命中该图层要素时触发                       |
| `options.once`    | `boolean`         | 只监听一次                              |

```ts
useMapEvent('moveend', () => {
  console.log('地图停止移动')
})

useMapEvent('mouseenter', onEnter, { layerId: 'stations' })
```

#### `useMapIdle(callback?, options?)`

监听地图「最终画面」：所有交互、动画和资源加载结束后触发。适合截图、导出、渲染完成统计等场景。

| 参数              | 类型                                  | 默认值     | 说明                                  |
| --------------- | ----------------------------------- | ------- | ----------------------------------- |
| `callback`      | `(map: SgMapInstance) => void`      | -       | `idle` 触发时的回调                       |
| `options.once`  | `boolean`                           | `false` | 只触发一次，触发后自动停止监听                     |
| `options.repaint` | `boolean`                         | `true`  | 注册时是否 `triggerRepaint()`，确保已空闲的地图也能触发回调 |

返回 `{ isIdle, stop }`：`isIdle` 为当前是否空闲，`stop()` 手动停止监听（卸载时会自动停止）。

```ts
const { isIdle } = useMapIdle((map) => {
  // 渲染完全结束，可以截图或导出
  const dataUrl = map.getCanvas().toDataURL('image/png')
}, { once: true })
```

> 与 `useMapEvent('render')` 的区别：`render` 每帧都会触发；`idle` 只在渲染停止时触发一次，代表「画面已稳定」。

#### `useMapClick(handler, options?)`

区分单击 / 双击。思极地图没有独立双击事件，这里用延迟判定：第一次点击后等待 `delay`，期间出现第二次点击视为双击。

| 参数                      | 类型                               | 默认值     | 说明                                        |
| ----------------------- | -------------------------------- | ------- | ----------------------------------------- |
| `handler`               | `(event: MapClickEvent) => void` | -       | 回调，`event.clickType` 为 `1`（单击）或 `2`（双击）   |
| `options.delay`         | `number`                         | `500`   | 判定延迟（毫秒）                                  |
| `options.queryFeatures` | `boolean`                        | `false` | 是否用 `queryRenderedFeatures` 填充 `features` |
| `options.layers`        | `string[]`                       | -       | 限定要素查询图层                                  |

```ts
useMapClick(
  ({ clickType, lngLat, features }) => {
    if (clickType === 1 && features?.length) {
      console.log('单击要素', features[0].properties)
    }
  },
  { queryFeatures: true, layers: ['stations'] },
)
```

#### `usePointerLngLat(options?)`

跟踪鼠标位置对应的经纬度。

| 参数                 | 类型       | 说明                                           |
| ------------------ | -------- | -------------------------------------------- |
| `options.throttle` | `number` | 节流间隔（毫秒）；不传则用 `requestAnimationFrame` 合并高频更新 |

返回：

| 字段            | 类型                                       | 说明       |
| ------------- | ---------------------------------------- | -------- |
| `lng` / `lat` | `Ref<number \| undefined>`               | 当前经纬度    |
| `lngLat`      | `ComputedRef<{ lng, lat } \| undefined>` | 组合值      |
| `isInside`    | `Ref<boolean>`                           | 鼠标是否在地图内 |
| `reset()`     | `() => void`                             | 清空坐标与状态  |

```ts
const { lng, lat, isInside } = usePointerLngLat()
```

***

### 视图控制

#### `useMapView(options?)`

| 参数             | 类型          | 默认值                | 说明          |
| -------------- | ----------- | ------------------ | ----------- |
| `options.mode` | `ErrorMode` | `'no-throw-error'` | 地图未就绪时的错误策略 |

返回：

| 方法                                       | 说明        |
| ---------------------------------------- | --------- |
| `flyTo({ center, zoom, ... })`           | 带动画的飞行    |
| `easeTo({ center, zoom, ... })`          | 平滑移动      |
| `fitBounds(bounds, { padding, ... })`    | 自适应范围     |
| `zoomTo(zoom, options?)`                 | 缩放到指定层级   |
| `zoomIn(options?)` / `zoomOut(options?)` | 放大 / 缩小   |
| `getCenter()` / `getZoom()`              | 当前中心 / 层级 |
| `setMaxBounds(bounds \| null)`           | 限制拖动范围    |

`center` 与 `bounds` 接受 `toLngLat` / `toBounds` 支持的所有格式。

```ts
const { flyTo, fitBounds, zoomIn } = useMapView()

flyTo({ center: [116.39, 39.9], zoom: 12, duration: 1200 })
fitBounds([[116.1, 39.7], [116.7, 40.1]], { padding: 50, maxZoom: 14 })
```

#### `useViewportFeatures(options?)`

响应式获取当前视口内的要素（基于 `map.queryRenderedFeatures`），默认在 `moveend` / `zoomend` / `idle` 后自动刷新。

| 参数              | 类型                  | 默认值                          | 说明                          |
| --------------- | ------------------- | ---------------------------- | --------------------------- |
| `layers`        | `string[]`          | -                            | 只查询这些图层的要素                  |
| `filter`        | `FilterSpecification` | -                          | 使用 Mapbox 表达式过滤要素           |
| `events`        | `string[]`          | `['moveend', 'zoomend', 'idle']` | 触发刷新的事件                     |
| `immediate`     | `boolean`           | `true`                       | 地图就绪后是否立即查询一次               |
| `throttle`      | `number`            | -                            | 节流间隔（毫秒）；不传则用 rAF 合并高频事件     |

返回：

| 字段 | 说明 |
|------|------|
| `features` | 当前视口内、可见图层中已渲染的要素（`ShallowRef<GeoJSONFeature[]>`） |
| `bounds` | 当前视口范围 `{ west, south, east, north }` |
| `refresh()` | 立即重新查询 |
| `stop()` | 手动停止监听（卸载时自动停止） |

```ts
const { features, bounds } = useViewportFeatures({
  layers: ['stations'],
  filter: ['==', 'status', 'active'],
})

watch(features, (list) => {
  console.log('视口内要素数量', list.length)
})
```

> `queryRenderedFeatures` 只返回**可见图层中真正渲染出来的**要素，会遵循图层显隐、样式过滤和碰撞避让。需要某个数据源的全部已加载要素时，请直接使用 `map.querySourceFeatures()`。数据量大时建议设置 `throttle`。

***

### 图层与数据源

#### `useGeoJSONSource(id, data, options?)`

声明式管理 GeoJSON 数据源。

| 参数             | 类型                              | 说明                       |
| -------------- | ------------------------------- | ------------------------ |
| `id`           | `string`                        | 数据源 id                   |
| `data`         | `MaybeRefOrGetter<GeoJSONData>` | 响应式 GeoJSON              |
| `options.deep` | `boolean`                       | 是否深度监听，默认 `false`（按引用比较） |

返回 `{ source, setData, refresh, remove }`。

```ts
const data = ref<GeoJSONData>({ type: 'FeatureCollection', features: [] })
const { setData } = useGeoJSONSource('orders', data)

data.value = nextCollection   // 自动调用 source.setData()
```

#### `useLayer(options)`

声明式管理单个图层。

| 参数                    | 类型                                              | 说明                                                                                                                |
| --------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`                  | `string`                                        | 图层 id                                                                                                             |
| `type`                | `string`                                        | 图层类型：`fill` / `line` / `symbol` / `circle` / `heatmap` / `fill-extrusion` / `raster` / `hillshade` / `background` |
| `source`              | `string \| SourceSpecification`                 | 数据源 id 或内联数据源                                                                                                     |
| `paint`               | `MaybeRefOrGetter<PaintSpecification>`          | 响应式样式                                                                                                             |
| `layout`              | `MaybeRefOrGetter<LayoutSpecification>`         | 响应式布局                                                                                                             |
| `filter`              | `MaybeRefOrGetter<FilterSpecification \| null>` | 响应式过滤                                                                                                             |
| `visible`             | `MaybeRefOrGetter<boolean>`                     | 显隐                                                                                                                |
| `beforeId`            | `string`                                        | 插入到指定图层之前                                                                                                         |
| `minzoom` / `maxzoom` | `number`                                        | 图层层级范围                                                                                                            |

返回 `{ layer, visible, setVisible, setPaint, setLayout, setFilter, remove }`。

`paint` / `layout` 采用逐键 diff，只对变化的属性调用 `setPaintProperty` / `setLayoutProperty`。

```ts
const color = ref('#68AFB0')

useLayer({
  id: 'district-fill',
  type: 'fill',
  source: 'districts',
  paint: computed(() => ({
    'fill-color': color.value,
    'fill-opacity': 0.4,
  })),
  visible: computed(() => showDistrict.value),
})
```

#### `useGeoJSONLayer(id, data, options)`

一步创建 GeoJSON 数据源 + 图层，最常用。

在 `useLayer` 的基础上增加：

| 参数         | 类型                                 | 说明                       |
| ---------- | ---------------------------------- | ------------------------ |
| `sourceId` | `string`                           | 数据源 id，默认 `${id}-source` |
| `cluster`  | `boolean \| { radius?, maxZoom? }` | 是否开启聚合                   |

返回在 `useLayer` 基础上增加 `sourceId`、`source`、`setData`、`refresh`。

```ts
const data = ref<GeoJSONData>({ type: 'FeatureCollection', features: [] })

useGeoJSONLayer('work-orders', data, {
  type: 'circle',
  cluster: { radius: 80, maxZoom: 16 },
  paint: {
    'circle-color': ['get', 'color'],
    'circle-radius': 6,
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 1,
  },
})
```

> 数据变化只调用 `setData`，不会重建数据源或图层。卸载时先移除图层，再移除本模块创建的数据源。

***

### 要素状态

#### `useFeatureState(sourceId)`

管理 `feature-state`，并在作用域销毁时清除所有已修改的要素状态，避免残留高亮。

返回 `{ set, get, remove, clear }`。

```ts
const state = useFeatureState('districts')

const highlight = (id: string | number) => {
  state.set(id, { highlight: true })
}

const clearHighlight = (id: string | number) => {
  state.remove(id)
}
```

配合 paint 表达式：

```ts
paint: {
  'fill-opacity': ['case', ['boolean', ['feature-state', 'highlight'], false], 0.8, 0.3],
}
```

***

### 弹窗与标记

#### `usePopup(options?)`

`options` 继承 `SGMap.Popup` 的构造参数，并额外支持 `lngLat`。

| 参数                       | 类型                                            | 说明                   |
| ------------------------ | --------------------------------------------- | -------------------- |
| `lngLat`                 | `MaybeRefOrGetter<MaybeLngLat \| undefined>`  | 传入后弹窗跟随该坐标，坐标变化只更新位置 |
| `closeButton`            | `boolean`                                     | 是否显示关闭按钮             |
| `closeOnClick`           | `boolean`                                     | 点击地图是否关闭             |
| `anchor`                 | `string`                                      | 锚点                   |
| `offset`                 | `[number, number] \| Record<string, unknown>` | 偏移                   |
| `maxWidth` / `className` | `string`                                      | 最大宽度 / 自定义类名         |

返回 `{ popup, show, hide, setLngLat, setHTML, setText, setDOMContent, setMaxWidth }`。

```ts
const position = ref<[number, number]>([116.39, 39.9])
const { show, hide, setHTML } = usePopup({
  lngLat: position,
  closeButton: true,
  closeOnClick: true,
})

setHTML('<div class="popup">工单详情</div>')
show()
```

- 提供 `lngLat` 时，地图就绪后自动显示
- 未提供 `lngLat` 时，调用 `show(lngLat?)` 才显示
- 组件卸载时自动 `remove()`

#### `useMarker(lngLat, options?)`

声明式标记点，地图就绪后自动添加到地图。

| 参数        | 类型                              | 说明                                                |
| --------- | ------------------------------- | ------------------------------------------------- |
| `lngLat`  | `MaybeRefOrGetter<MaybeLngLat>` | 响应式坐标                                             |
| `options` | `SgMarkerOptions`               | `element`、`anchor`、`offset`、`color`、`draggable` 等 |

返回 `{ marker, visible, show, hide, setLngLat }`。

```ts
const position = ref<[number, number]>([116.39, 39.9])

const { marker } = useMarker(position, {
  color: '#409EFF',
  draggable: true,
})

position.value = [116.4, 39.91]   // 自动更新位置
```

***

### 图片与缺失图标

#### `useMapImage(id, url, options?)`

加载并注册地图图片（用于 `icon-image`、`*-pattern`）。

| 参数                   | 类型                         | 说明         |
| -------------------- | -------------------------- | ---------- |
| `id`                 | `string`                   | 图片 id      |
| `url`                | `MaybeRefOrGetter<string>` | 图片地址，支持响应式 |
| `options.pixelRatio` | `number`                   | 像素比        |
| `options.sdf`        | `boolean`                  | 是否为 SDF 图片 |

返回 `{ loaded, reload }`。

```ts
const { loaded } = useMapImage('icon-order', '/icons/order.png', { pixelRatio: 2 })
```

#### `useStyleImageMissing(resolver)`

监听 `styleimagemissing`，自动补齐缺失图标。`resolver` 可以是对象映射或函数。

```ts
useStyleImageMissing({
  icon_order_1: '/icons/icon_order_1.png',
  icon_order_2: '/icons/icon_order_2.png',
})

// 或按规则解析
useStyleImageMissing((id) => `/icons/${id}.png`)
```

同一 id 只会加载一次；组件卸载时自动 `off`。

***

### DOM 锚定

#### `useLocated(coordinate, options?)`

把 DOM 固定在经纬度上，返回 `{ x, y, show, style }`。

| 参数                  | 类型                                                                                                               | 说明                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- |
| `coordinate`        | `MaybeRefOrGetter<MaybeLngLat>`                                                                                  | 锚点坐标                 |
| `options.placement` | `'top' \| 'topLeft' \| 'topRight' \| 'bottom' \| 'bottomLeft' \| 'bottomRight' \| 'left' \| 'right' \| 'center'` | 内容相对锚点的位置，默认 `'top'` |
| `options.offset`    | `MaybeRefOrGetter<[number, number]>`                                                                             | 额外像素偏移               |
| `options.visible`   | `MaybeRefOrGetter<boolean>`                                                                                      | 是否显示                 |

`style` 可直接绑定到绝对定位元素：

```vue
<script setup lang="ts">
const { style, show } = useLocated(() => [116.39, 39.9], { placement: 'bottom' })
</script>

<template>
  <div v-show="show" :style="style">锚定内容</div>
</template>
```

#### `<Located>` 组件

`useLocated` 的组件封装，更易用。

```vue
<Located :coordinate="[116.39, 39.9]" placement="top" :offset="[0, -8]">
  <div class="marker">标注</div>
</Located>
```

| Prop         | 类型                 | 默认值      | 说明     |
| ------------ | ------------------ | -------- | ------ |
| `coordinate` | `MaybeLngLat`      | -        | 锚点坐标   |
| `placement`  | `LocatedPlacement` | `'top'`  | 内容摆放位置 |
| `offset`     | `[number, number]` | `[0, 0]` | 额外像素偏移 |
| `visible`    | `boolean`          | `true`   | 是否显示   |

> `<Located>` 需要位于 `<SgMap>` 或 `useMapProvider` 的子树中。

***

### 组件

#### `<SgMap>`

地图容器组件，内部完成 SDK 加载、认证、建图、等待 `load`、上下文注入与尺寸监听。

| Prop         | 类型                        | 默认值    | 说明                                         |
| ------------ | ------------------------- | ------ | ------------------------------------------ |
| `sdk`        | `LoadSGMapOptions`        | -      | `src` / `appkey` / `appsecret` / `plugins` |
| `mapOptions` | `Record<string, unknown>` | -      | 传给 `new SGMap.Map()` 的参数（不需要 `container`）  |
| `autoResize` | `boolean`                 | `true` | 容器尺寸变化时自动 `map.resize()`                   |

事件：

| 事件      | 参数              | 说明          |
| ------- | --------------- | ----------- |
| `load`  | `SgMapInstance` | 地图加载完成      |
| `error` | `unknown`       | SDK 加载或建图失败 |

暴露：

| 字段         | 说明    |
| ---------- | ----- |
| `map`      | 地图实例  |
| `isLoaded` | 是否已加载 |

```vue
<SgMap ref="sgMapRef" :sdk="sdk" :map-options="mapOptions" @load="onLoad">
  <slot />
</SgMap>
```

***

## 常见问题

### 地图不显示 / 高度为 0

`<SgMap>` 的根节点是 `width: 100%; height: 100%`，父容器必须有明确高度：

```vue
<div style="width: 100vw; height: 100vh">
  <SgMap ... />
</div>
```

### 在 `setup()` 中拿不到地图实例

地图在父组件 `onMounted` 中异步创建。请改用：

```ts
const map = await useMapReady()
// 或
onMapReady(useMapContext(), (map) => { /* ... */ })
```

### 组合式函数没有自动清理

自动清理依赖 effect scope。请确保在组件 `setup()` 或 `effectScope()` 内调用，而不是在普通函数、`setTimeout` 或事件回调中临时调用。

### 修改了 GeoJSON 内部字段但图层没更新

`useGeoJSONSource` 默认按引用比较。修改内部字段时：

```ts
data.value.features.push(feature)
data.value = { ...data.value }   // 触发引用变化

// 或开启深度监听（大对象有性能开销）
useGeoJSONSource('orders', data, { deep: true })
```

### 单击会触发两次

思极地图底层没有独立双击事件，`useMapClick` 通过延迟判定。若业务自己也监听了原生 `click`，会与延迟判定叠加，建议统一使用 `useMapClick`。

### 坐标系问题

本库不做坐标转换，输入输出均按经纬度原样处理。需要在 WGS84 / GCJ-02 之间转换时，通过 `loadSGMap({ plugins: ['SGMap.ConvertTask'] })` 加载插件后使用 `SGMap.ConvertTask`。

### 多个地图实例

`loadSGMap` 是页面级单例，但 `useMapProvider` / `<SgMap>` 的上下文按组件树隔离，可以同时挂载多个地图：

```vue
<SgMap :sdk="sdk" :map-options="optionsA">...</SgMap>
<SgMap :sdk="sdk" :map-options="optionsB">...</SgMap>
```

每个子树中的 `useMap()` 只会拿到自己祖先提供的地图。

### 常用底图样式

| style                               | 说明       |
| ----------------------------------- | -------- |
| `aegis://styles/aegis/Streets-v2`   | 街道地图（推荐） |
| `aegis://styles/aegis/Satellite`    | 卫星影像     |
| `aegis://styles/aegis/Satellite512` | 高分辨率卫星影像 |

***

## 本地开发

```bash
npm install        # 安装依赖
npm test           # 运行单元测试（Vitest + jsdom）
npm run test:watch # 监听模式
npm run typecheck  # vue-tsc 类型检查
npm run build      # 构建 dist（ESM + d.ts）
```

构建产物：

```
dist/
├── index.mjs / index.d.ts
├── imports.mjs / imports.d.ts
├── resolvers.mjs / resolvers.d.ts
├── core/
├── shared/
└── types/
```

`vue` 保持 external，不会被写入产物。

### 目录结构

```
src/
├── index.ts                 # 主入口
├── imports.ts               # 自动导入入口
├── resolvers.ts             # 组件解析器
├── types/sgmap.ts           # 思极地图类型子集
├── shared/                  # 错误处理、坐标、几何、SDK 单例
└── core/
    ├── utils/               # loadSGMap / toLngLat / toBounds ...
    ├── composables/         # useMapProvider / useLayer / useLocated ...
    └── components/          # SgMap / Located
```

