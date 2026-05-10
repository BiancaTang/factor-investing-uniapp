<template>
  <view class="lobby-screen">
    <view class="lobby-header">
      <text class="lobby-title">因子博弈沙盘</text>
      <text class="lobby-subtitle">FACTOR INVESTING BATTLE</text>
    </view>

    <view class="lobby-center">
      <FactorRing :exposure="demoExposure" :current-round="0" :size="360" />
    </view>

    <view class="lobby-status">
      <text class="status-text">{{ roomName }}</text>
      <text class="status-players">{{ readyCount }} / {{ maxPlayers }}</text>
    </view>

    <view class="lobby-players">
      <view v-for="player in readyPlayers" :key="player.uid" class="ready-chip">
        <image v-if="player.avatar" :src="player.avatar" class="chip-avatar" />
        <text v-else class="chip-dot">◆</text>
        <text class="chip-name">{{ player.nickName }}</text>
      </view>
    </view>

    <view class="lobby-quote">
      <text class="quote-text">等待管理员开启第一轮</text>
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
  margin-bottom: 32px;
}

.lobby-title {
  font-size: 28px;
  font-weight: 300;
  color: #c9a84c;
  display: block;
  letter-spacing: 8px;
}

.lobby-subtitle {
  font-size: 12px;
  color: #444;
  display: block;
  margin-top: 12px;
  letter-spacing: 4px;
}

.lobby-center {
  margin: 24px 0;
}

.lobby-status {
  text-align: center;
  margin: 20px 0;
}

.status-text {
  font-size: 12px;
  color: #555;
  display: block;
  letter-spacing: 2px;
}

.status-players {
  font-size: 16px;
  font-weight: 400;
  color: #888;
  display: block;
  margin-top: 8px;
  letter-spacing: 2px;
}

.lobby-players {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 16px 0;
  max-width: 600px;
}

.ready-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(201, 168, 76, 0.06);
  border: 1px solid rgba(201, 168, 76, 0.12);
  border-radius: 2px;
}

.chip-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.chip-dot {
  font-size: 10px;
  color: #c9a84c;
}

.chip-name {
  font-size: 11px;
  color: #777;
  letter-spacing: 1px;
}

.lobby-quote {
  position: absolute;
  bottom: 72px;
  text-align: center;
}

.quote-text {
  font-size: 11px;
  color: #333;
  letter-spacing: 3px;
}
</style>