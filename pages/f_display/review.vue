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
        <text class="panel-title">净值走势（相对首轮收益率 %）</text>
        <view v-if="chartPlayers.length" class="curve-chart">
          <view class="curve-y-axis">
            <text class="y-tick">{{ yAxisTopLabel }}</text>
            <text class="y-tick y-mid">{{ yAxisMidLabel }}</text>
            <text class="y-tick y-bot">{{ yAxisBotLabel }}</text>
          </view>
          <view class="curve-main">
            <view
              v-for="player in chartPlayers"
              :key="player.uid"
              class="curve-line"
            >
              <text class="curve-name" :style="{ color: player.color }">
                {{ player.nickName }}
              </text>
              <view class="curve-track">
                <view
                  v-for="(seg, si) in player.segments"
                  :key="'s-' + si"
                  class="curve-seg"
                  :style="[seg.style, { background: player.color }]"
                />
                <view
                  v-for="(pt, pi) in player.points"
                  :key="'p-' + pi"
                  class="curve-point"
                  :style="pt.style"
                >
                  <view class="point-dot" :style="{ background: player.color }" />
                </view>
                <text class="curve-end" :style="{ color: player.color }">{{ player.endLabel }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="curve-empty">
          <text>暂无已提交玩家的净值序列</text>
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
  players: { type: Array, default: () => [] },
  navSeriesByUid: { type: Object, default: () => ({}) }
})

const factorDefs = F_FACTOR_DEFS
const colors = F_FACTOR_COLORS

const LINE_COLORS = ['#c9a84c', '#4a9eff', '#43a047', '#e57373', '#ba68c8', '#ffb74d']
const MIN_Y_SPAN_PCT = 12

const effectRows = computed(() => f_eventEffectRowsFromEffects(props.event && props.event.effects))

function seriesToReturnPct(series) {
  const s = (series || []).map((n) => Number(n)).filter((n) => Number.isFinite(n))
  if (!s.length) return [0]
  const base = s[0] || 1
  return s.map((n) => ((n / base - 1) * 100))
}

const yRange = computed(() => {
  let min = Infinity
  let max = -Infinity
  props.players.slice(0, 6).forEach((p) => {
    const uid = String(p.uid || '')
    const raw = props.navSeriesByUid[uid]
    if (!Array.isArray(raw) || !raw.length) return
    for (const pct of seriesToReturnPct(raw)) {
      if (pct < min) min = pct
      if (pct > max) max = pct
    }
  })
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: -5, max: 5 }
  }
  let span = max - min
  if (span < MIN_Y_SPAN_PCT) {
    const mid = (max + min) / 2
    min = mid - MIN_Y_SPAN_PCT / 2
    max = mid + MIN_Y_SPAN_PCT / 2
    span = MIN_Y_SPAN_PCT
  }
  const pad = span * 0.08
  return { min: min - pad, max: max + pad }
})

const yAxisTopLabel = computed(() => `${yRange.value.max >= 0 ? '+' : ''}${yRange.value.max.toFixed(1)}%`)
const yAxisMidLabel = computed(() => {
  const mid = (yRange.value.max + yRange.value.min) / 2
  return `${mid >= 0 ? '+' : ''}${mid.toFixed(1)}%`
})
const yAxisBotLabel = computed(() => `${yRange.value.min >= 0 ? '+' : ''}${yRange.value.min.toFixed(1)}%`)

function pctToBottom(pct) {
  const { min, max } = yRange.value
  const range = Math.max(0.001, max - min)
  return ((pct - min) / range) * 100
}

function buildTrackGeometry(returnPct) {
  const len = returnPct.length
  const points = returnPct.map((pct, ridx) => ({
    pct,
    style: {
      left: len <= 1 ? '88%' : `${(ridx / (len - 1)) * 82 + 4}%`,
      bottom: `${Math.min(98, Math.max(2, pctToBottom(pct)))}%`
    }
  }))
  const segments = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const leftA = parseFloat(a.style.left)
    const leftB = parseFloat(b.style.left)
    const botA = parseFloat(a.style.bottom)
    const botB = parseFloat(b.style.bottom)
    const dx = leftB - leftA
    const dy = botB - botA
    const width = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    segments.push({
      style: {
        left: a.style.left,
        bottom: a.style.bottom,
        width: `${width}%`,
        transform: `rotate(${angle}deg)`
      }
    })
  }
  return { points, segments }
}

const chartPlayers = computed(() => {
  const out = []
  props.players.slice(0, 6).forEach((p, idx) => {
    const uid = String(p.uid || '')
    const raw = props.navSeriesByUid[uid]
    if (!Array.isArray(raw) || !raw.length) return
    const returnPct = seriesToReturnPct(raw)
    const { points, segments } = buildTrackGeometry(returnPct)
    const lastPct = returnPct[returnPct.length - 1]
    out.push({
      uid,
      nickName: p.nickName || uid.slice(0, 6),
      color: LINE_COLORS[idx % LINE_COLORS.length],
      points,
      segments,
      endLabel: `${lastPct >= 0 ? '+' : ''}${lastPct.toFixed(1)}%`
    })
  })
  return out
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
  height: 38%;
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
  color: #666;
  margin-bottom: 12px;
  letter-spacing: 2px;
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
  display: flex;
  gap: 10px;
  min-height: 0;
}

.curve-y-axis {
  width: 52px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0 28px;
}

.y-tick {
  font-size: 9px;
  color: #555;
  font-variant-numeric: tabular-nums;
}

.curve-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.curve-line {
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex: 1;
  min-height: 44px;
}

.curve-name {
  width: 72px;
  font-size: 10px;
  text-align: right;
  flex-shrink: 0;
  padding-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.curve-track {
  flex: 1;
  position: relative;
  height: 100%;
  min-height: 44px;
  border-left: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.15);
}

.curve-seg {
  position: absolute;
  height: 2px;
  transform-origin: left center;
  opacity: 0.85;
  pointer-events: none;
}

.curve-point {
  position: absolute;
  transform: translate(-50%, 50%);
  z-index: 2;
}

.point-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255,255,255,0.25);
}

.curve-end {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.curve-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #444;
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
