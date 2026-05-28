<template>
  <view class="finale-screen">
    <view class="finale-header">
      <text class="finale-title">终局盛典</text>
    </view>

    <view class="champion-section">
      <view class="champion-card">
        <text class="champion-label">CHAMPION</text>
        <view class="champion-avatar" :style="{ borderColor: getFactionColor(champion?.charFaction) }">
          <image v-if="champion?.avatar" :src="champion.avatar" class="champion-img" />
          <text v-else class="champion-symbol">◆</text>
        </view>
        <text class="champion-name">{{ champion?.nickName || '待定' }}</text>
        <text class="champion-char">{{ champion?.charName || '' }}</text>
        <text class="champion-nav">NAV {{ champion?.nav || '1.0000' }}</text>
      </view>
    </view>

    <view class="podium-section">
      <view v-for="(player, idx) in top3" :key="player.uid" class="podium-item" :class="`podium-${idx + 1}`">
        <text class="podium-medal">{{ ['I', 'II', 'III'][idx] }}</text>
        <text class="podium-name">{{ player.nickName }}</text>
        <text class="podium-nav">{{ player.nav }}</text>
      </view>
    </view>

    <view class="highlights-section">
      <text class="highlights-title">精彩瞬间</text>
      <view class="highlights-list">
        <view v-for="(h, idx) in highlights" :key="idx" class="highlight-card">
          <text class="highlight-round">R{{ h.round }}</text>
          <text class="highlight-desc">{{ h.desc }}</text>
        </view>
      </view>
    </view>

    <view class="finale-footer">
      <text class="finale-thanks">感谢参与 · 因子博弈沙盘</text>
    </view>
    <f-factor-intro-fab />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  players: { type: Array, default: () => [] },
  roundHistory: { type: Array, default: () => [] }
})

const FACTION_COLORS = {
  value: '#4a6fa5', growth: '#43a047', momentum: '#fbc02d',
  stable: '#90a4ae', aggressive: '#e53935'
}

const sortedPlayers = computed(() =>
  [...props.players].sort((a, b) => Number(b.nav) - Number(a.nav))
)

const champion = computed(() => sortedPlayers.value[0])
const top3 = computed(() => sortedPlayers.value.slice(0, 3))

const highlights = computed(() => {
  const rounds = props.roundHistory.length
  if (rounds === 0) return []
  return [
    { round: Math.min(rounds, 2), desc: '首次净值突破 1.2' },
    { round: Math.min(rounds, 4), desc: '单轮最高收益 +15%' },
    { round: rounds, desc: '冠军诞生时刻' }
  ]
})

function getFactionColor(faction) {
  return FACTION_COLORS[faction] || '#c9a84c'
}
</script>

<style scoped>
.finale-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  background: #050505;
}

.finale-header {
  margin-bottom: 32px;
}

.finale-title {
  font-size: 16px;
  font-weight: 300;
  color: #c9a84c;
  letter-spacing: 8px;
}

.champion-section {
  margin-bottom: 32px;
}

.champion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 56px;
  background: rgba(201, 168, 76, 0.04);
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: 1px;
  animation: championIn 1s ease;
}

@keyframes championIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.champion-label {
  font-size: 10px;
  color: #c9a84c;
  letter-spacing: 6px;
  margin-bottom: 16px;
}

.champion-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  margin-bottom: 16px;
}

.champion-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.champion-symbol {
  font-size: 28px;
  color: #333;
}

.champion-name {
  font-size: 18px;
  font-weight: 400;
  color: #e8e4dc;
  letter-spacing: 2px;
}

.champion-char {
  font-size: 11px;
  color: #555;
  margin: 6px 0;
  letter-spacing: 1px;
}

.champion-nav {
  font-size: 20px;
  font-weight: 300;
  color: #c9a84c;
  letter-spacing: 2px;
}

.podium-section {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 32px;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255,255,255,0.02);
  border-radius: 1px;
  min-width: 120px;
}

.podium-1 {
  background: rgba(201, 168, 76, 0.05);
  border: 1px solid rgba(201, 168, 76, 0.1);
  padding-top: 20px;
}

.podium-2 {
  padding-top: 16px;
}

.podium-3 {
  padding-top: 12px;
}

.podium-medal {
  font-size: 18px;
  color: #c9a84c;
  font-weight: 300;
  margin-bottom: 6px;
}

.podium-name {
  font-size: 13px;
  color: #888;
}

.podium-nav {
  font-size: 14px;
  font-weight: 400;
  color: #c9a84c;
  margin-top: 4px;
}

.highlights-section {
  margin-bottom: 32px;
}

.highlights-title {
  font-size: 10px;
  color: #444;
  text-align: center;
  display: block;
  margin-bottom: 12px;
  letter-spacing: 4px;
}

.highlights-list {
  display: flex;
  gap: 12px;
}

.highlight-card {
  padding: 10px 18px;
  background: rgba(255,255,255,0.015);
  border-radius: 1px;
  text-align: center;
}

.highlight-round {
  font-size: 10px;
  color: #c9a84c;
  display: block;
  letter-spacing: 1px;
}

.highlight-desc {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.finale-footer {
  margin-top: auto;
}

.finale-thanks {
  font-size: 11px;
  color: #333;
  letter-spacing: 3px;
}
</style>