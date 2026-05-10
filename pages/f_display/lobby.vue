<template>
  <view class="lobby-screen">
    <view class="lobby-header">
      <text class="lobby-title">🎲 因子博弈沙盘 2.0</text>
      <text class="lobby-subtitle">Factor Investing Battle Arena</text>
    </view>

    <view class="lobby-center">
      <FactorRing :exposure="demoExposure" :current-round="0" :size="360" />
    </view>

    <view class="lobby-status">
      <text class="status-text">房间 {{ roomName }}</text>
      <text class="status-players">玩家 {{ readyCount }}/{{ maxPlayers }} 已就绪</text>
    </view>

    <view class="lobby-players">
      <view v-for="player in readyPlayers" :key="player.uid" class="ready-chip">
        <image v-if="player.avatar" :src="player.avatar" class="chip-avatar" />
        <text v-else class="chip-emoji">🎲</text>
        <text class="chip-name">{{ player.nickName }}</text>
      </view>
    </view>

    <view class="lobby-quote">
      <text class="quote-text">"格雷厄姆：安全边际，是我唯一的信仰。"</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import FactorRing from '@/components/f-display/factor-ring.vue'

const props = defineProps({
  roomName: { type: String, default: '' },
  players: { type: Array, default: () => [] },
  maxPlayers: { type: Number, default: 20 }
})

const readyPlayers = computed(() => props.players.slice(0, 8))
const readyCount = computed(() => props.players.length)

// 候场时的演示数据（轻微脉动）
const demoExposure = computed(() => ({
  fac_size: 0.5,
  fac_beta: -0.3,
  fac_momentum: 0.8,
  fac_non_linear_size: 0.2,
  fac_book_to_price: -0.5,
  fac_earnings_yield: 0.3,
  fac_growth: 1.2,
  fac_leverage: -0.2,
  fac_liquidity: 0.4,
  fac_residual_volatility: -0.6
}))
</script>

<style scoped>
.lobby-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.lobby-header {
  text-align: center;
  margin-bottom: 24px;
}

.lobby-title {
  font-size: 32px;
  font-weight: bold;
  color: #d4af37;
  display: block;
}

.lobby-subtitle {
  font-size: 16px;
  color: #888;
  display: block;
  margin-top: 8px;
}

.lobby-center {
  margin: 20px 0;
}

.lobby-status {
  text-align: center;
  margin: 16px 0;
}

.status-text {
  font-size: 14px;
  color: #aaa;
  display: block;
}

.status-players {
  font-size: 18px;
  font-weight: bold;
  color: #f0f0f0;
  display: block;
  margin-top: 4px;
}

.lobby-players {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 12px 0;
  max-width: 600px;
}

.ready-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 16px;
}

.chip-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.chip-emoji {
  font-size: 14px;
}

.chip-name {
  font-size: 12px;
  color: #ccc;
}

.lobby-quote {
  position: absolute;
  bottom: 60px;
  text-align: center;
}

.quote-text {
  font-size: 13px;
  color: #666;
  font-style: italic;
}
</style>
