<template>
  <view class="finale-screen">
    <view class="finale-header">
      <text class="finale-title">🏆🏆🏆 终局盛典 🏆🏆🏆</text>
    </view>

    <view class="champion-section">
      <view class="champion-card">
        <text class="champion-label">冠军</text>
        <view class="champion-avatar" :style="{ borderColor: getFactionColor(champion?.charFaction) }">
          <image v-if="champion?.avatar" :src="champion.avatar" class="champion-img" />
          <text v-else class="champion-emoji">{{ getFactionEmoji(champion?.charFaction) }}</text>
        </view>
        <text class="champion-name">{{ champion?.nickName || '待定' }}</text>
        <text class="champion-char">{{ champion?.charName || '' }}</text>
        <text class="champion-nav">NAV {{ champion?.nav || '1.0000' }}</text>
      </view>
    </view>

    <view class="podium-section">
      <view v-for="(player, idx) in top3" :key="player.uid" class="podium-item" :class="`podium-${idx + 1}`">
        <text class="podium-medal">{{ ['🥇', '🥈', '🥉'][idx] }}</text>
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
      <text class="finale-thanks">感谢参与 · 因子博弈沙盘 2.0</text>
    </view>
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
const FACTION_EMOJIS = {
  value: '🏰', growth: '🚀', momentum: '⚡', stable: '🛡️', aggressive: '🔥'
}

const sortedPlayers = computed(() =>
  [...props.players].sort((a, b) => Number(b.nav) - Number(a.nav))
)

const champion = computed(() => sortedPlayers.value[0])
const top3 = computed(() => sortedPlayers.value.slice(0, 3))

const highlights = computed(() => {
  // 简化：生成几个假的高光时刻
  const rounds = props.roundHistory.length
  if (rounds === 0) return []
  return [
    { round: Math.min(rounds, 2), desc: '首次净值突破 1.2' },
    { round: Math.min(rounds, 4), desc: '单轮最高收益 +15%' },
    { round: rounds, desc: '冠军诞生时刻' }
  ]
})

function getFactionColor(faction) {
  return FACTION_COLORS[faction] || '#d4af37'
}
function getFactionEmoji(faction) {
  return FACTION_EMOJIS[faction] || '👑'
}
</script>

<style scoped>
.finale-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 60%);
}

.finale-header {
  margin-bottom: 24px;
}

.finale-title {
  font-size: 26px;
  font-weight: bold;
  color: #d4af37;
  letter-spacing: 4px;
}

.champion-section {
  margin-bottom: 24px;
}

.champion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 48px;
  background: rgba(212, 175, 55, 0.08);
  border: 2px solid rgba(212, 175, 55, 0.3);
  border-radius: 16px;
  animation: championIn 1s ease;
}

@keyframes championIn {
  from { opacity: 0; transform: scale(0.8) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.champion-label {
  font-size: 14px;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 12px;
}

.champion-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #222;
  margin-bottom: 12px;
}

.champion-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.champion-emoji {
  font-size: 40px;
}

.champion-name {
  font-size: 20px;
  font-weight: bold;
  color: #f0f0f0;
}

.champion-char {
  font-size: 13px;
  color: #888;
  margin: 4px 0;
}

.champion-nav {
  font-size: 24px;
  font-weight: bold;
  color: #d4af37;
}

.podium-section {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  min-width: 120px;
}

.podium-1 {
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.2);
  padding-top: 20px;
}

.podium-2 {
  padding-top: 16px;
}

.podium-3 {
  padding-top: 12px;
}

.podium-medal {
  font-size: 28px;
  margin-bottom: 4px;
}

.podium-name {
  font-size: 14px;
  color: #ccc;
}

.podium-nav {
  font-size: 16px;
  font-weight: bold;
  color: #d4af37;
  margin-top: 4px;
}

.highlights-section {
  margin-bottom: 24px;
}

.highlights-title {
  font-size: 14px;
  color: #888;
  text-align: center;
  display: block;
  margin-bottom: 8px;
}

.highlights-list {
  display: flex;
  gap: 12px;
}

.highlight-card {
  padding: 8px 16px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  text-align: center;
}

.highlight-round {
  font-size: 11px;
  color: #d4af37;
  display: block;
}

.highlight-desc {
  font-size: 12px;
  color: #aaa;
}

.finale-footer {
  margin-top: auto;
}

.finale-thanks {
  font-size: 13px;
  color: #555;
}
</style>