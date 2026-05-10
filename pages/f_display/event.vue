<template>
  <view class="event-screen">
    <view class="event-flash">MARKET EVENT</view>

    <view class="event-card-container">
      <view class="event-card" :class="{ flipped: showFront }">
        <!-- 背面 -->
        <view class="card-face card-back">
          <text class="back-logo">◈</text>
          <text class="back-text">MARKET EVENT</text>
        </view>

        <!-- 正面 -->
        <view class="card-face card-front">
          <text class="card-id">{{ event?.cardId || 'EVT-??' }}</text>
          <text class="card-name">{{ event?.name || '未知事件' }}</text>
          <text class="card-category">{{ event?.category || '事件' }}</text>
          <view class="card-divider" />
          <text class="card-desc">{{ event?.description || '市场正在发生变化...' }}</text>
          <view v-if="event?.effects?.length" class="card-effects">
            <view v-for="(eff, idx) in event.effects" :key="idx" class="effect-row">
              <text class="effect-factor">{{ eff.factor }}</text>
              <text class="effect-value">{{ eff.type }} {{ eff.value }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="event-affected">
      <text class="affected-title">受影响因子</text>
      <view class="affected-factors">
        <view
          v-for="eff in (event?.effects || [])"
          :key="eff.factor"
          class="affected-tag"
          :style="{ backgroundColor: getFactorColor(eff.factor) + '15', borderColor: getFactorColor(eff.factor) + '40' }"
        >
          {{ eff.factor }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { F_FACTOR_COLORS, F_FACTOR_DEFS } from '@/utils/f_gameFactorSpec.js'

const props = defineProps({
  event: { type: Object, default: null }
})

const showFront = ref(false)

const FAC_KEY_MAP = Object.fromEntries(
  F_FACTOR_DEFS.map(d => [d.internal, d.key])
)

function getFactorColor(internal) {
  return F_FACTOR_COLORS[internal] || '#888'
}

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
  margin-bottom: 40px;
}

.event-card {
  width: 300px;
  height: 420px;
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
  height: 100%;
  backface-visibility: hidden;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  box-sizing: border-box;
}

.card-back {
  background: #080808;
  border: 1px solid rgba(201, 168, 76, 0.15);
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
  align-self: flex-start;
  letter-spacing: 1px;
}

.card-name {
  font-size: 20px;
  font-weight: 400;
  color: #e8e4dc;
  text-align: center;
  margin: 12px 0 8px;
  letter-spacing: 1px;
}

.card-category {
  font-size: 11px;
  color: #c9a84c;
  background: rgba(201, 168, 76, 0.06);
  padding: 3px 10px;
  border-radius: 1px;
  letter-spacing: 2px;
}

.card-divider {
  width: 40px;
  height: 1px;
  background: rgba(201, 168, 76, 0.2);
  margin: 24px 0;
}

.card-desc {
  font-size: 13px;
  color: #777;
  text-align: center;
  line-height: 1.8;
}

.card-effects {
  margin-top: 20px;
  width: 100%;
}

.effect-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

.effect-factor {
  font-size: 11px;
  color: #555;
}

.effect-value {
  font-size: 11px;
  color: #c9a84c;
  font-weight: 400;
}

.event-affected {
  text-align: center;
}

.affected-title {
  font-size: 10px;
  color: #444;
  display: block;
  margin-bottom: 10px;
  letter-spacing: 3px;
}

.affected-factors {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.affected-tag {
  padding: 3px 10px;
  border-radius: 1px;
  border: 1px solid;
  font-size: 10px;
  color: #888;
  letter-spacing: 1px;
}
</style>