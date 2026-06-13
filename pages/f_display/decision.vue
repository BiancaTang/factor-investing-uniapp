<template>
  <view class="decision-screen">
    <view class="decision-header">
      <text class="round-badge">ROUND {{ roundIndex }}</text>
    </view>

    <view class="decision-body">
      <view class="tri-panel">
        <text class="panel-title">随机事件</text>
        <view class="panel-body panel-scroll">
          <FRoundMarketEvent
            v-if="marketSnapshot && marketSnapshot.name && marketOpenRound"
            variant="displayPanel"
            :snapshot="marketSnapshot"
            :open-round="marketOpenRound"
          />
          <view v-else class="panel-empty">
            <text class="panel-empty-text">{{ eventEmptyHint }}</text>
          </view>
        </view>
      </view>

      <view class="tri-panel">
        <text class="panel-title">群体偏好</text>
        <view class="panel-body">
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

      <view class="tri-panel">
        <text class="panel-title">因子累积收益</text>
        <view class="panel-body">
          <view class="factor-chart-wrap">
            <FGameCharts
              :chart-data="frozenFactorChartData"
              display-mode="factorOnly"
              hide-factor-table
              static-chart
              chart-large
              :chart-inner-height-px="factorChartHeight"
            />
          </view>
        </view>
      </view>
    </view>

    <view class="decision-runway">
      <Runway :players="players" />
    </view>

    <view class="decision-footer">
      <text class="submit-status">已提交 {{ submittedCount }} / {{ totalPlayers }}</text>
      <view class="countdown" :class="{ urgent: timeLeft <= 30 }">
        <text class="countdown-num">{{ formatTime(timeLeft) }}</text>
      </view>
      <view class="submit-avatars">
        <image
          v-for="p in submittedPlayers"
          :key="p.uid"
          :src="p.avatar || '/static/default-avatar.png'"
          class="submit-avatar"
        />
      </view>
    </view>
    <f-factor-intro-fab />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import FGameCharts from '@/components/f-game-charts/f-game-charts.vue'
import Runway from '@/components/f-display/runway.vue'
import FRoundMarketEvent from '@/components/f-round-market-event/f-round-market-event.vue'
import { F_FACTOR_DEFS } from '@/utils/f_gameFactorSpec.js'
import { F_FACTOR_COLORS } from '@/utils/f_factorPalette.js'
import { useDisplayFactorChartSnapshot } from '@/composables/useDisplayFactorChartSnapshot.js'

const props = defineProps({
  roundIndex: { type: Number, default: 0 },
  timeLeft: { type: Number, default: 180 },
  players: { type: Array, default: () => [] },
  groupExposure: { type: Object, default: () => ({}) },
  submittedCount: { type: Number, default: 0 },
  totalPlayers: { type: Number, default: 0 },
  marketSnapshot: { type: Object, default: null },
  marketOpenRound: { type: Number, default: 0 },
  ifBanker: { type: Boolean, default: false },
  fGroupCount: { type: Number, default: 20 },
  roomAdminUid: { type: String, default: '' },
  simulationPlayers: { type: Array, default: () => [] },
  roleIdByPlayerId: { type: Object, default: () => ({}) },
  role1_10ActiveRoundByPlayerId: { type: Object, default: () => ({}) },
  roleActiveVariantByPlayerId: { type: Object, default: () => ({}) },
  role11ActiveRoundByPlayerId: { type: Object, default: () => ({}) },
  roundEventFactorMultipliersByRound: { type: Object, default: () => ({}) }
})

const { frozenFactorChartData, factorChartHeight } = useDisplayFactorChartSnapshot(() => props)

const eventEmptyHint = computed(() => {
  const ri = parseInt(props.roundIndex, 10)
  if (Number.isFinite(ri) && ri > 0 && ri % 2 !== 0) return '单数轮无随机事件'
  return '暂无随机事件'
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
  const pct = (Math.abs(val) / max) * 50
  const color = colors[def.internal]

  if (val >= 0) {
    return {
      width: pct + '%',
      marginLeft: '50%',
      backgroundColor: color,
      opacity: 0.6
    }
  } else {
    return {
      width: pct + '%',
      marginLeft: (50 - pct) + '%',
      backgroundColor: color,
      opacity: 0.6
    }
  }
}
</script>

<style scoped>
.decision-screen {
  width: 100%;
  max-width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px 20px 14px;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
}

.decision-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
  min-width: 0;
}

.round-badge {
  font-size: 14px;
  font-weight: 400;
  color: #c9a84c;
  letter-spacing: 3px;
  flex-shrink: 0;
}

.countdown {
  flex-shrink: 0;
  box-sizing: border-box;
  background: rgba(201, 168, 76, 0.06);
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 4px;
  padding: 6px 14px;
  min-width: 96px;
}

.countdown.urgent {
  border-color: rgba(201, 168, 76, 0.5);
  background: rgba(201, 168, 76, 0.1);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.countdown-num {
  display: block;
  font-size: 22px;
  font-weight: 400;
  color: #e8e4dc;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 1px;
  white-space: nowrap;
  text-align: center;
  line-height: 1.2;
}

.decision-body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 14px;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.tri-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(201, 168, 76, 0.16);
  border-radius: 6px;
  overflow: hidden;
}

.panel-title {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(201, 168, 76, 0.9);
  letter-spacing: 4px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-body {
  flex: 1;
  min-height: 0;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
}

.panel-scroll {
  overflow-y: auto;
}

.panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.panel-empty-text {
  font-size: 15px;
  color: #666;
  letter-spacing: 2px;
  text-align: center;
  line-height: 1.5;
}

.exposure-bars {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  min-height: 0;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0;
}

.bar-label {
  width: 64px;
  font-size: 13px;
  color: #888;
  text-align: right;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.bar-track {
  flex: 1;
  height: 14px;
  background: rgba(255,255,255,0.04);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.8s ease;
}

.bar-value {
  width: 44px;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  flex-shrink: 0;
}

.attribution-wrap,
.factor-chart-wrap {
  width: 100%;
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.attribution-wrap :deep(.charts),
.factor-chart-wrap :deep(.charts) {
  margin-top: 0;
}

.attribution-wrap :deep(.block),
.factor-chart-wrap :deep(.block) {
  margin-bottom: 0;
}

.attribution-wrap :deep(.sub),
.factor-chart-wrap :deep(.sub) {
  display: none;
}

.attribution-wrap :deep(.chart-box),
.factor-chart-wrap :deep(.chart-box) {
  border-color: rgba(201, 168, 76, 0.15);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.2);
}

.attribution-wrap :deep(.empty),
.factor-chart-wrap :deep(.empty) {
  font-size: 14px;
  color: #666;
  letter-spacing: 1px;
  text-align: center;
  padding: 40px 12px;
}

.attribution-wrap :deep(.chart-inner),
.factor-chart-wrap :deep(.chart-inner) {
  min-height: 260px;
}

.decision-runway {
  margin-top: 10px;
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.decision-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
}

.submit-status {
  font-size: 13px;
  color: #666;
  letter-spacing: 1px;
  flex-shrink: 0;
}

.submit-avatars {
  display: flex;
  margin-left: auto;
}

.submit-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid #050505;
  margin-left: -4px;
}
</style>
