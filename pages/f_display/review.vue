<template>
  <view class="review-screen">
    <view class="review-header">
      <text class="review-title">ROUND {{ roundIndex }} 复盘</text>
    </view>

    <view class="review-body">
      <view class="top-row">
        <view class="radar-panel">
          <text class="panel-title">群体因子偏好</text>
          <view class="radar-placeholder">
            <view class="radar-factors">
              <view v-for="def in factorDefs" :key="def.key" class="radar-dot">
                <text class="dot-label">{{ def.label }}</text>
                <text class="dot-value" :style="{ color: colors[def.internal] }">
                  {{ formatExposure(def.key) }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view class="event-panel">
          <text class="panel-title">事件冲击</text>
          <view v-if="event" class="event-card-mini">
            <text class="mini-name">{{ event.name }}</text>
            <text class="mini-category">{{ event.category }}</text>
            <view v-if="effectRows.length" class="mini-fx-row">
              <view
                v-for="(row, idx) in effectRows"
                :key="idx"
                class="mini-chip"
                :class="row.direction"
              >
                <text class="mini-chip-lab">{{ row.label }}</text>
                <text class="mini-chip-val">{{ row.multiplierText }}</text>
              </view>
            </view>
            <text v-if="event.lore" class="mini-lore">{{ event.lore }}</text>
          </view>
          <view v-else class="event-empty">
            <text>本轮无事件</text>
          </view>
        </view>
      </view>

      <view class="curve-panel">
        <text class="panel-title">净值走势</text>
        <view class="curve-chart">
          <view v-for="player in topPlayers" :key="player.uid" class="curve-line">
            <text class="curve-name" :style="{ color: colors[player.faction] || '#555' }">
              {{ player.nickName }}
            </text>
            <view class="curve-points">
              <view
                v-for="(nav, ridx) in player.history"
                :key="ridx"
                class="curve-point"
                :style="{ left: (ridx / (player.history.length - 1 || 1) * 100) + '%', bottom: ((nav - 0.8) / 1.2 * 100) + '%' }"
              >
                <view class="point-dot" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="review-footer">
      <text class="waiting-text">等待管理员开启第 {{ roundIndex + 1 }} 轮</text>
    </view>
    <f-factor-intro-fab />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { F_FACTOR_DEFS } from '@/utils/f_gameFactorSpec.js'
import { F_FACTOR_COLORS } from '@/utils/f_factorPalette.js'
import { f_eventEffectRowsFromEffects } from '@/utils/f_roundRandomEventDisplay.js'

const props = defineProps({
  roundIndex: { type: Number, default: 0 },
  groupExposure: { type: Object, default: () => ({}) },
  event: { type: Object, default: null },
  skillLog: { type: Array, default: () => [] },
  roundHistory: { type: Array, default: () => [] },
  players: { type: Array, default: () => [] }
})

const factorDefs = F_FACTOR_DEFS
const colors = F_FACTOR_COLORS

const effectRows = computed(() => f_eventEffectRowsFromEffects(props.event && props.event.effects))

const topPlayers = computed(() => {
  return props.players.slice(0, 5).map(p => ({
    ...p,
    history: [1, 1.05, 1.12, Number(p.nav)]
  }))
})

function formatExposure(key) {
  const val = props.groupExposure[key]
  if (val == null) return '0'
  const n = Number(val)
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}
</script>

<style scoped>
.review-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 32px 40px;
}

.review-header {
  margin-bottom: 20px;
}

.review-title {
  font-size: 14px;
  font-weight: 400;
  color: #c9a84c;
  letter-spacing: 4px;
}

.review-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.top-row {
  display: flex;
  gap: 16px;
  height: 40%;
}

.radar-panel, .event-panel {
  flex: 1;
  background: rgba(255,255,255,0.015);
  border-radius: 1px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 10px;
  color: #444;
  margin-bottom: 12px;
  letter-spacing: 3px;
}

.radar-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.radar-factors {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  width: 100%;
}

.radar-dot {
  text-align: center;
  padding: 6px;
  background: rgba(0,0,0,0.2);
  border-radius: 1px;
}

.dot-label {
  font-size: 9px;
  color: #555;
  display: block;
  letter-spacing: 1px;
}

.dot-value {
  font-size: 11px;
  font-weight: 400;
  display: block;
  margin-top: 3px;
}

.event-card-mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px;
  background: rgba(201, 168, 76, 0.03);
  border-radius: 1px;
  border-left: 1px solid rgba(201, 168, 76, 0.2);
}

.mini-name {
  font-size: 14px;
  font-weight: 400;
  color: #aaa;
}

.mini-category {
  font-size: 10px;
  color: #c9a84c;
  margin: 4px 0 10px;
  letter-spacing: 1px;
}

.mini-fx-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.mini-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mini-chip.up {
  background: rgba(76, 175, 80, 0.1);
}

.mini-chip.down {
  background: rgba(229, 115, 115, 0.08);
}

.mini-chip-lab {
  font-size: 10px;
  color: #ccc;
  font-weight: 600;
}

.mini-chip-val {
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mini-chip.up .mini-chip-val {
  color: #81c784;
}

.mini-chip.down .mini-chip-val {
  color: #ffab91;
}

.mini-lore {
  font-size: 10px;
  color: #666;
  line-height: 1.5;
}

.event-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #333;
}

.curve-panel {
  flex: 1;
  background: rgba(255,255,255,0.015);
  border-radius: 1px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.curve-chart {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curve-line {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
}

.curve-name {
  width: 80px;
  font-size: 10px;
  text-align: right;
  flex-shrink: 0;
}

.curve-points {
  flex: 1;
  position: relative;
  height: 100%;
}

.curve-point {
  position: absolute;
  transform: translate(-50%, 50%);
}

.point-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}

.review-footer {
  text-align: center;
  padding: 16px 0;
}

.waiting-text {
  font-size: 11px;
  color: #333;
  letter-spacing: 2px;
}
</style>
