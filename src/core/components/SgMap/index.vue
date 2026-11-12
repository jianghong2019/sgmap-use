<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useMapProvider } from '~composables/useMapProvider'
import { sgmapError } from '~shared/errorHandler'
import type { SgMapInstance } from '~types/sgmap'
import { loadSGMap, type LoadSGMapOptions } from '~utils/loadSGMap'

const props = withDefaults(
  defineProps<{
    /** SDK 加载参数：脚本地址、认证信息、插件。 */
    sdk?: LoadSGMapOptions
    /** 传给 `new SGMap.Map()` 的参数（无需 container）。 */
    mapOptions?: Record<string, unknown>
    /** 容器尺寸变化时自动调用 `map.resize()`，默认 `true`。 */
    autoResize?: boolean
  }>(),
  {
    autoResize: true,
  },
)

const emit = defineEmits<{
  (event: 'load', map: SgMapInstance): void
  (event: 'error', error: unknown): void
}>()

const containerRef = ref<HTMLDivElement>()

const { map, isLoaded } = useMapProvider(async () => {
  try {
    const lib = await loadSGMap(props.sdk)
    const container = containerRef.value

    if (!container) throw sgmapError('map container is not ready')

    return new lib.Map({ container, ...props.mapOptions })
  } catch (error) {
    emit('error', error)
    throw error
  }
})

watch(isLoaded, (loaded) => {
  if (loaded && map.value) emit('load', map.value)
})

let observer: ResizeObserver | undefined

onMounted(() => {
  if (!props.autoResize) return
  if (typeof ResizeObserver === 'undefined' || !containerRef.value) return

  observer = new ResizeObserver(() => map.value?.resize())
  observer.observe(containerRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = undefined
  map.value?.remove?.()
})

defineExpose({ map, isLoaded })
</script>

<template>
  <div
    ref="containerRef"
    class="sgmap-container"
    style="position: relative; width: 100%; height: 100%; overflow: hidden"
  >
    <slot />
  </div>
</template>
