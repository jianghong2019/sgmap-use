<script setup lang="ts">
import { useLocated, type LocatedPlacement } from '~composables/useLocated'
import type { MaybeLngLat } from '~shared/coordinate'

const props = withDefaults(
  defineProps<{
    /** 锚点经纬度。 */
    coordinate: MaybeLngLat
    /** 内容相对锚点的摆放位置。 */
    placement?: LocatedPlacement
    /** 额外像素偏移 `[x, y]`。 */
    offset?: [number, number]
    /** 是否显示。 */
    visible?: boolean
  }>(),
  {
    placement: 'top',
    offset: () => [0, 0],
    visible: true,
  },
)

const { style } = useLocated(
  () => props.coordinate,
  {
    placement: () => props.placement,
    offset: () => props.offset,
    visible: () => props.visible,
  },
)
</script>

<template>
  <div class="sgmap-located" :style="style">
    <slot />
  </div>
</template>
