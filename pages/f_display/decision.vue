<template>
  <view class="decision-screen">
    <view class="decision-header">
      <text class="round-badge">ROUND {{ roundIndex }}</text>
      <view class="countdown" :class="{ urgent: timeLeft <= 30 }">
        <text class="countdown-num">{{ formatTime(timeLeft) }}</text>
      </view>
    </view>

    <view class="decision-body">
      <view class="left-panel">
        <FactorRing :exposure="groupExposure" :current-round="roundIndex" :size="320" />
      </view>

      <view class="right-panel">
        <view class="exposure-bars">
          <view v-for="def in factorDefs" :key="def.key" class="bar-row">
            <text class="bar-label">{{ def.label }}</text>
            <view class="bar-track">
              <view class="bar-fill" :style="getBarStyle(def)" />
            </view>
            <text class="bar-value" :style="{ color: colors[def.internal] }">{{ formatBarValue(def.key) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="decision-runway">
      <Runway :players="players" />
    </view>

    <view class="decision-footer">
      <text class="submit-status">已提交 {{ submittedCount }}/{{ totalPlayers }}</text>
      <view class="submit-avatars">
        <image
          v-for="p in submittedPlayers"
          :key="p.uid"
          :src="p.avatar || '/static/default-avatar.png'"
          class="submit-avatar"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import FactorRing from '@/components/f-display/factor-ring.vue'
import Runway from '@/components/f-display/runway.vue'
import { F_FACTOR_DEFS, F_FACTOR_COLORS } from '@/utils/f_gameFactorSpec.js'

const props = defineProps({
  roundIndex: { type: Number, default: 0 },
  timeLeft: { type: Number, default: 180 },
  players: { type: Array, default: () => [] },
  groupExposure: { type: Object, default: () => ({}) },
  submittedCount: { type: Number, default: 0 },
  totalPlayers: { type: Number, default: 0 }
})

const factorDefs = F_FACTOR_DEFS
const colors = F_FACTOR_COLORS

const submittedPlayers = computed(() => props.players.filter(p => p.hasSubmitted).slice(0, 10))

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatBarValue(key) {
  const val = props.groupExposure[key]
  if (val == null) return '0'
  const n = Number(val)
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

function getBarStyle(def) {
  const val = Number(props.groupExposure[def.key] || 0)
  const max = 5
  const pct = (Math.abs(val) / max) * 50 // 最多占50%宽度（居中）
  const color = colors[def.internal]

  if (val >= 0) {
    return {
      width: pct + '%',
      marginLeft: '50%',
      backgroundColor: color
    }
  } else {
    return {
      width: pct + '%',
      marginLeft: (50 - pct) + '%',
      backgroundColor: color
    }
  }
}
</script>

<style scoped>
.decision-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 32px;
}

.decision-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.round-badge {
  font-size: 20px;
  font-weight: bold;
  color: #d4af37;
  letter-spacing: 2px;
}

.countdown {
  background: rgba(212, 175, 55, 0.15);
  border: 2px solid #d4af37;
  border-radius: 8px;
  padding: 8px 20px;
}

.countdown.urgent {
  border-color: #f44336;
  background: rgba(244, 67, 54, 0.15);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.countdown-num {
  font-size: 28px;
  font-weight: bold;
  color: #f0f0f0;
  font-variant-numeric: tabular-nums;
}

.decision-body {
  flex: 1;
  display: flex;
  gap: 24px;
  min-height: 0;
}

.left-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.right-panel {
  flex: 1;
  display: flex;
  align-items: center;
}

.exposure-bars {
  width: 100%;
  max-width: 400px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
}

.bar-label {
  width: 56px;
  font-size: 12px;
  color: #aaa;
  text-align: right;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 16px;
  background: #222;
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: all 0.8s ease;
  opacity: 0.8;
}

.bar-value {
  width: 40px;
  font-size: 12px;
  font-weight: bold;
  text-align: left;
  flex-shrink: 0;
}

.decision-runway {
  margin-top: 12px;
}

.decision-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #333;
}

.submit-status {
  font-size: 13px;
  color: #888;
}

.submit-avatars {
  display: flex;
  gap: -4px;
}

.submit-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #0a0a0a;
  margin-left: -4px;
}
</style>
