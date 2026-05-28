<template>
  <view class="settlement-screen">
    <view class="settlement-header">
      <text class="settle-title">ROUND {{ roundIndex }} 结算</text>
    </view>

    <view class="settlement-body">
      <view class="ranking-panel">
        <text class="panel-title">净值排名</text>
        <view class="ranking-list">
          <view
            v-for="(player, idx) in sortedPlayers"
            :key="player.uid"
            class="rank-item"
            :class="{ 'rank-top3': idx < 3 }"
            :style="getRankItemStyle(idx)"
          >
            <text class="rank-num">{{ idx + 1 }}</text>
            <view class="rank-avatar" :style="{ borderColor: getFactionColor(player.charFaction) }">
              <image v-if="player.avatar" :src="player.avatar" class="rank-img" />
              <text v-else class="rank-symbol">◆</text>
            </view>
            <view class="rank-info">
              <text class="rank-name">{{ player.nickName }}</text>
              <text class="rank-nav" :class="{ 'nav-up': player.navChange > 0, 'nav-down': player.navChange < 0 }">
                {{ player.nav }}
              </text>
            </view>
            <text v-if="idx < 3" class="rank-medal">{{ ['I', 'II', 'III'][idx] }}</text>
          </view>
        </view>
      </view>

      <view class="factor-panel">
        <text class="panel-title">因子归因</text>
        <view class="factor-chart">
          <view v-for="def in factorDefs" :key="def.key" class="factor-row">
            <text class="factor-label">{{ def.label }}</text>
            <view class="factor-bar-track">
              <view class="factor-bar" :style="getFactorBarStyle(def)" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="skill-danmaku">
      <view v-for="(skill, idx) in visibleSkills" :key="idx" class="danmaku-item" :style="getDanmakuStyle(idx)">
        {{ skill.f_char_name || '某角色' }} 触发 {{ skill.f_skill_name }}
      </view>
    </view>
    <f-factor-intro-fab />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { F_FACTOR_DEFS } from '@/utils/f_gameFactorSpec.js'
import { F_FACTOR_COLORS } from '@/utils/f_factorPalette.js'

const props = defineProps({
  roundIndex: { type: Number, default: 0 },
  players: { type: Array, default: () => [] },
  skillLog: { type: Array, default: () => [] }
})

const factorDefs = F_FACTOR_DEFS
const colors = F_FACTOR_COLORS

const sortedPlayers = computed(() =>
  [...props.players].sort((a, b) => Number(b.nav) - Number(a.nav)).slice(0, 8)
)

const visibleSkills = computed(() => props.skillLog.slice(-3))

const FACTION_COLORS = {
  value: '#4a6fa5', growth: '#43a047', momentum: '#fbc02d',
  stable: '#90a4ae', aggressive: '#e53935'
}

function getFactionColor(faction) {
  return FACTION_COLORS[faction] || '#333'
}

function getRankItemStyle(idx) {
  return {
    animationDelay: `${idx * 0.15}s`
  }
}

function getFactorBarStyle(def) {
  const val = Math.random() * 0.05
  const pct = Math.min(val * 2000, 100)
  return {
    width: pct + '%',
    backgroundColor: colors[def.internal] || '#333',
    opacity: 0.5
  }
}

function getDanmakuStyle(idx) {
  return {
    animationDuration: `${6 + idx * 2}s`,
    animationDelay: `${idx * 0.5}s`,
    top: `${20 + idx * 30}px`
  }
}
</script>

<style scoped>
.settlement-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 32px 40px;
}

.settlement-header {
  text-align: center;
  margin-bottom: 24px;
}

.settle-title {
  font-size: 14px;
  font-weight: 400;
  color: #c9a84c;
  letter-spacing: 4px;
}

.settlement-body {
  flex: 1;
  display: flex;
  gap: 32px;
  min-height: 0;
}

.ranking-panel {
  width: 45%;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 11px;
  color: #444;
  margin-bottom: 12px;
  letter-spacing: 3px;
}

.ranking-list {
  flex: 1;
  overflow-y: auto;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.02);
  border-radius: 1px;
  margin-bottom: 4px;
  opacity: 0;
  animation: slideIn 0.5s ease forwards;
}

.rank-top3 {
  background: rgba(201, 168, 76, 0.04);
  border-left: 2px solid rgba(201, 168, 76, 0.3);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.rank-num {
  width: 20px;
  font-size: 12px;
  font-weight: 400;
  color: #444;
  text-align: center;
}

.rank-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  flex-shrink: 0;
}

.rank-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rank-symbol {
  font-size: 14px;
  color: #333;
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rank-name {
  font-size: 12px;
  color: #888;
}

.rank-nav {
  font-size: 14px;
  font-weight: 400;
  color: #c9a84c;
}

.nav-up {
  color: #7a9a6a;
}

.nav-down {
  color: #9a5a5a;
}

.rank-medal {
  font-size: 14px;
  color: #c9a84c;
  font-weight: 300;
}

.factor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.factor-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.factor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 3px 0;
}

.factor-label {
  width: 56px;
  font-size: 10px;
  color: #444;
  text-align: right;
  flex-shrink: 0;
  letter-spacing: 1px;
}

.factor-bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.02);
  border-radius: 1px;
  overflow: hidden;
}

.factor-bar {
  height: 100%;
  border-radius: 1px;
  transition: width 1s ease;
}

.skill-danmaku {
  position: fixed;
  top: 80px;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 80;
}

.danmaku-item {
  position: absolute;
  white-space: nowrap;
  padding: 5px 14px;
  background: rgba(5,5,5,0.85);
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: 1px;
  font-size: 11px;
  color: #888;
  animation: danmakuSlide linear forwards;
  letter-spacing: 1px;
}

@keyframes danmakuSlide {
  from { left: 100%; }
  to { left: -100%; }
}
</style>