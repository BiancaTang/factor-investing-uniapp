<template>
  <view class="review-screen">
    <view class="review-header">
      <text class="review-title">📊 ROUND {{ roundIndex }} 复盘</text>
    </view>

    <view class="review-body">
      <view class="top-row">
        <view class="radar-panel">
          <text class="panel-title">群体因子偏好</text>
          <view class="radar-placeholder">
            <text class="placeholder-text">[10因子雷达图]</text>
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
            <text class="mini-desc">{{ event.description }}</text>
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
            <text class="curve-name" :style="{ color: colors[player.faction] || '#888' }">
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
      <text class="waiting-text">等待管理员开启第 {{ roundIndex + 1 }} 轮...</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { F_FACTOR_DEFS, F_FACTOR_COLORS } from '@/utils/f_gameFactorSpec.js'

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

const topPlayers = computed(() => {
  // 简化：展示前5名玩家的净值历史
  return props.players.slice(0, 5).map(p => ({
    ...p,
    history: [1, 1.05, 1.12, Number(p.nav)] // TODO: 接入真实历史数据
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
  padding: 24px 32px;
}

.review-header {
  margin-bottom: 16px;
}

.review-title {
  font-size: 20px;
  font-weight: bold;
  color: #d4af37;
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
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}

.radar-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 12px;
  color: #555;
}

.radar-factors {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.radar-dot {
  text-align: center;
  padding: 4px;
  background: rgba(0,0,0,0.3);
  border-radius: 4px;
}

.dot-label {
  font-size: 10px;
  color: #888;
  display: block;
}

.dot-value {
  font-size: 12px;
  font-weight: bold;
  display: block;
  margin-top: 2px;
}

.event-card-mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px;
  background: rgba(212, 175, 55, 0.05);
  border-radius: 6px;
  border-left: 3px solid #d4af37;
}

.mini-name {
  font-size: 15px;
  font-weight: bold;
  color: #f0f0f0;
}

.mini-category {
  font-size: 11px;
  color: #d4af37;
  margin: 2px 0;
}

.mini-desc {
  font-size: 12px;
  color: #aaa;
}

.event-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #555;
}

.curve-panel {
  flex: 1;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  padding: 12px;
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
  font-size: 11px;
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
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.review-footer {
  text-align: center;
  padding: 12px 0;
}

.waiting-text {
  font-size: 13px;
  color: #666;
}
</style>