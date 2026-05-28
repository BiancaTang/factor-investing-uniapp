<template>
  <view class="event-screen">
    <view class="event-flash">MARKET EVENT</view>

    <view class="event-card-container">
      <view class="event-card" :class="{ flipped: showFront }">
        <view class="card-face card-back">
          <text class="back-logo">◈</text>
          <text class="back-text">MARKET EVENT</text>
        </view>

        <view class="card-face card-front">
          <text class="card-id">{{ event?.cardId || 'EVT-??' }}</text>
          <text class="card-name">{{ event?.name || '未知事件' }}</text>
          <text class="card-category">{{ event?.category || '事件' }}</text>

          <view v-if="effectRows.length" class="card-fx">
            <text class="card-fx-title">因子倾向</text>
            <view class="card-fx-row">
              <view
                v-for="(row, idx) in effectRows"
                :key="idx"
                class="fx-chip"
                :class="row.direction"
              >
                <text class="fx-chip-lab">{{ row.label }}</text>
                <text class="fx-chip-val">{{ row.multiplierText }}</text>
              </view>
            </view>
          </view>

          <view v-if="event?.lore" class="card-lore">
            <text class="card-lore-label">历史背景</text>
            <text class="card-lore-text">{{ event.lore }}</text>
          </view>
        </view>
      </view>
    </view>
    <f-factor-intro-fab />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { f_eventEffectRowsFromEffects } from '@/utils/f_roundRandomEventDisplay.js'

const props = defineProps({
  event: { type: Object, default: null }
})

const showFront = ref(false)
const effectRows = computed(() => f_eventEffectRowsFromEffects(props.event && props.event.effects))

onMounted(() => {
  setTimeout(() => {
    showFront.value = true
  }, 800)
})
</script>

<style scoped>
.event-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.event-flash {
  font-size: 14px;
  font-weight: 300;
  color: #c9a84c;
  letter-spacing: 6px;
  margin-bottom: 40px;
  animation: flashIn 0.5s ease;
}

@keyframes flashIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.event-card-container {
  perspective: 1000px;
}

.event-card {
  width: 360px;
  min-height: 440px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.event-card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  min-height: 440px;
  backface-visibility: hidden;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  padding: 28px 32px 32px;
  box-sizing: border-box;
}

.card-back {
  background: #080808;
  border: 1px solid rgba(201, 168, 76, 0.15);
  align-items: center;
  justify-content: center;
}

.back-logo {
  font-size: 48px;
  color: #c9a84c;
  margin-bottom: 20px;
  opacity: 0.3;
}

.back-text {
  font-size: 12px;
  color: #444;
  letter-spacing: 4px;
}

.card-front {
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  transform: rotateY(180deg);
}

.card-id {
  font-size: 10px;
  color: #333;
  letter-spacing: 1px;
}

.card-name {
  font-size: 22px;
  font-weight: 600;
  color: #e8e4dc;
  margin: 10px 0 8px;
  line-height: 1.35;
}

.card-category {
  align-self: flex-start;
  font-size: 11px;
  color: #c9a84c;
  background: rgba(201, 168, 76, 0.08);
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 1px;
}

.card-fx {
  margin-top: 24px;
  flex: 1;
}

.card-fx-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #e6c86a;
  margin-bottom: 12px;
}

.card-fx-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.fx-chip {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 118px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.fx-chip.up {
  background: rgba(76, 175, 80, 0.12);
  border-color: rgba(129, 199, 132, 0.3);
}

.fx-chip.down {
  background: rgba(229, 115, 115, 0.1);
  border-color: rgba(255, 171, 145, 0.25);
}

.fx-chip-lab {
  font-size: 14px;
  font-weight: 700;
  color: #f0ead8;
}

.fx-chip-val {
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.fx-chip.up .fx-chip-val {
  color: #a5d6a7;
}

.fx-chip.down .fx-chip-val {
  color: #ffab91;
}

.card-lore {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid rgba(201, 168, 76, 0.15);
}

.card-lore-label {
  display: block;
  font-size: 10px;
  color: #666;
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.card-lore-text {
  display: block;
  font-size: 12px;
  color: #888;
  line-height: 1.55;
}
</style>
