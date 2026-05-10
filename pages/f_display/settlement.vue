<template>
  <view class="settlement-screen">
    <view class="settlement-header">
      <text class="settle-title">🏆 ROUND {{ roundIndex }} 结算</text>
    </view>

    <view class="settlement-body">
      <view class="ranking-panel">
        <view class="ranking-title">净值排名</view>
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
              <text v-else class="rank-emoji">{{ getFactionEmoji(player.charFaction) }}</text>
            </view>
            <view class="rank-info">
              <text class="rank-name">{{ player.nickName }}</text>
              <text class="rank-nav" :class="{ 'nav-up': player.navChange > 0, 'nav-down': player.navChange < 0 }">
                {{ player.nav }}
              </text>
            </view>
            <text v-if="idx < 3" class="rank-medal">{{ ['🥇', '🥈', '🥉'][idx] }}</text>
          </view>
        </view>
      </view>

      <view class="factor-panel">
        <view class="factor-title">因子归因</view>
        <view class="factor-chart">
          <!-- 简化版柱状图 -->
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
        🎭 {{ skill.f_char_name || '某角色' }} 触发【{{ skill.f_skill_name }}】
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { F_FACTOR_DEFS, F_FACTOR_COLORS } from '@/utils/f_gameFactorSpec.js'

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
const FACTION_EMOJIS = {
  value: '🏰', growth: '🚀', momentum: '⚡', stable: '🛡️', aggressive: '🔥'
}

function getFactionColor(faction) {
  return FACTION_COLORS[faction] || '#888'
}
function getFactionEmoji(faction) {
  return FACTION_EMOJIS[faction] || '🎲'
}

function getRankItemStyle(idx) {
  return {
    animationDelay: `${idx * 0.15}s`
  }
}

function getFactorBarStyle(def) {
  // 简化：用群体暴露模拟因子贡献
  const val = Math.random() * 0.05 // TODO: 接入真实归因数据
  const pct = Math.min(val * 2000, 100)
  return {
    width: pct + '%',
    backgroundColor: colors[def.internal] || '#888'
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
  padding: 24px 32px;
}

.settlement-header {
  text-align: center;
  margin-bottom: 16px;
}

.settle-title {
  font-size: 22px;
  font-weight: bold;
  color: #d4af37;
}

.settlement-body {
  flex: 1;
  display: flex;
  gap: 24px;
  min-height: 0;
}

.ranking-panel {
  width: 45%;
  display: flex;
  flex-direction: column;
}

.ranking-title {
  font-size: 14px;
  color: #888;
  margin-bottom: 8px;
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
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  margin-bottom: 6px;
  opacity: 0;
  animation: slideIn 0.5s ease forwards;
}

.rank-top3 {
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.2);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.rank-num {
  width: 24px;
  font-size: 14px;
  font-weight: bold;
  color: #888;
  text-align: center;
}

.rank-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #222;
}

.rank-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rank-emoji {
  font-size: 18px;
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rank-name {
  font-size: 13px;
  color: #ccc;
}

.rank-nav {
  font-size: 15px;
  font-weight: bold;
  color: #d4af37;
}

.nav-up {
  color: #4caf50;
}

.nav-down {
  color: #f44336;
}

.rank-medal {
  font-size: 20px;
}

.factor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.factor-title {
  font-size: 14px;
  color: #888;
  margin-bottom: 8px;
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
  margin: 4px 0;
}

.factor-label {
  width: 64px;
  font-size: 11px;
  color: #aaa;
  text-align: right;
  flex-shrink: 0;
}

.factor-bar-track {
  flex: 1;
  height: 12px;
  background: #222;
  border-radius: 3px;
  overflow: hidden;
}

.factor-bar {
  height: 100%;
  border-radius: 3px;
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
  padding: 6px 16px;
  background: rgba(0,0,0,0.7);
  border: 1px solid #d4af37;
  border-radius: 16px;
  font-size: 13px;
  color: #d4af37;
  animation: danmakuSlide linear forwards;
}

@keyframes danmakuSlide {
  from { left: 100%; }
  to { left: -100%; }
}
</style>