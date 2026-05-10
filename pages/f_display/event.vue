<template>
  <view class="event-screen">
    <view class="event-flash">⚡ MARKET EVENT ⚡</view>

    <view class="event-card-container">
      <view class="event-card" :class="{ flipped: showFront }">
        <!-- 背面 -->
        <view class="card-face card-back">
          <text class="back-logo">🎲</text>
          <text class="back-text">市场事件</text>
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
          :style="{ backgroundColor: getFactorColor(eff.factor) + '30', borderColor: getFactorColor(eff.factor) }"
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
  // 1秒后翻转卡片
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
  font-size: 28px;
  font-weight: bold;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 32px;
  animation: flashIn 0.5s ease;
}

@keyframes flashIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.event-card-container {
  perspective: 1000px;
  margin-bottom: 32px;
}

.event-card {
  width: 320px;
  height: 440px;
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
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.card-back {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #d4af37;
}

.back-logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.back-text {
  font-size: 20px;
  color: #d4af37;
  letter-spacing: 4px;
}

.card-front {
  background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
  border: 2px solid #444;
  transform: rotateY(180deg);
}

.card-id {
  font-size: 11px;
  color: #666;
  align-self: flex-start;
}

.card-name {
  font-size: 24px;
  font-weight: bold;
  color: #f0f0f0;
  text-align: center;
  margin: 8px 0;
}

.card-category {
  font-size: 13px;
  color: #d4af37;
  background: rgba(212, 175, 55, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

.card-divider {
  width: 60%;
  height: 1px;
  background: #333;
  margin: 16px 0;
}

.card-desc {
  font-size: 14px;
  color: #ccc;
  text-align: center;
  line-height: 1.6;
}

.card-effects {
  margin-top: 12px;
  width: 100%;
}

.effect-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #222;
}

.effect-factor {
  font-size: 12px;
  color: #aaa;
}

.effect-value {
  font-size: 12px;
  color: #d4af37;
  font-weight: bold;
}

.event-affected {
  text-align: center;
}

.affected-title {
  font-size: 13px;
  color: #888;
  display: block;
  margin-bottom: 8px;
}

.affected-factors {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.affected-tag {
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 12px;
  color: #f0f0f0;
}
</style>
