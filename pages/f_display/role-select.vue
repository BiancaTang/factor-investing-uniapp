<template>
  <view class="role-select-container">
    <!-- 头部 -->
    <view class="header">
      <text class="title">选择你的角色</text>
      <view class="countdown">
        <text class="countdown-label">剩余时间</text>
        <text class="countdown-time">{{ countdown }}s</text>
      </view>
    </view>

    <!-- 角色网格 -->
    <view class="role-grid">
      <view
        v-for="(role, index) in roles"
        :key="role.id"
        class="role-card"
        :class="{ 'selected': role.selected }"
      >
        <image class="role-image" :src="role.image" mode="aspectFit" />
        <view class="role-info">
          <text class="role-name">{{ role.name }}</text>
          <text class="role-subtitle">{{ role.subtitle }}</text>
          <view class="factor-tags">
            <text class="factor-tag main">主:{{ role.mainFactor }}</text>
            <text class="factor-tag sub">副:{{ role.subFactor }}</text>
          </view>
          <text class="skill-summary">{{ role.skillSummary }}</text>
        </view>
        <view v-if="role.selected" class="selected-mask">
          <text class="selected-text">✓ 已选</text>
          <text v-if="role.selectedBy" class="selected-by">{{ role.selectedBy }}</text>
        </view>
      </view>
    </view>

    <!-- 底部状态 -->
    <view class="footer">
      <text class="footer-text">已选 {{ selectedCount }}/10 | 剩余 {{ remainingCount }}</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    roomId: { type: String, required: true },
    roleSelectStatus: { type: Array, default: () => [] },
    timeLeft: { type: Number, default: 60 }
  },
  data() {
    return {
      countdown: 60,
      timer: null,
      roles: [
        {
          id: 1, name: '萤火', subtitle: '小市值成长', mainFactor: '规模', subFactor: '成长',
          skillSummary: '借势: 规模改为-5/-3 | 轻身: 成长>0则规模收益×2', image: '/static/roles/no1.png',
          selected: false, selectedBy: ''
        },
        {
          id: 2, name: '追风', subtitle: '牛市猎手', mainFactor: '贝塔', subFactor: '动量',
          skillSummary: '逐浪: 贝塔改为均值+2或最大值 | 乘势: 动量>0则贝塔收益×2', image: '/static/roles/no2.png',
          selected: false, selectedBy: ''
        },
        {
          id: 3, name: '盾墙', subtitle: '熊市防守', mainFactor: '残差波动', subFactor: '市净',
          skillSummary: '预判: 残差波动改为-4或最低-1 | 铁壁: 市净>0则残差波动收益×2', image: '/static/roles/no3.png',
          selected: false, selectedBy: ''
        },
        {
          id: 4, name: '刀客', subtitle: '涨停敢死队', mainFactor: '动量', subFactor: '流动性',
          skillSummary: '追涨: 动量改为最高+1或庄家+2 | 嗜血: 流动性>0则动量收益×2', image: '/static/roles/no4.png',
          selected: false, selectedBy: ''
        },
        {
          id: 5, name: '掘墓人', subtitle: '深度价值', mainFactor: '市净', subFactor: '盈利收益',
          skillSummary: '左侧: 市净改为+4或+5 | 捡漏: 盈利收益>0则市净收益×2', image: '/static/roles/no5.png',
          selected: false, selectedBy: ''
        },
        {
          id: 6, name: '磐石', subtitle: '质量稳健', mainFactor: '盈利收益', subFactor: '杠杆',
          skillSummary: '避险: 盈利收益改为均值+1或+2 | 厚利: 杠杆<0则盈利收益×2', image: '/static/roles/no6.png',
          selected: false, selectedBy: ''
        },
        {
          id: 7, name: '夹缝', subtitle: '中盘掘金', mainFactor: '非线性规模', subFactor: '成长',
          skillSummary: '腾挪: 非线性规模改为0或庄家相反数 | 中坚: 成长>0则非线性规模收益×2', image: '/static/roles/no7.png',
          selected: false, selectedBy: ''
        },
        {
          id: 8, name: '秤砣', subtitle: 'GARP策略', mainFactor: '成长', subFactor: '市净',
          skillSummary: '纠偏: 成长改为均值或庄家值 | 平衡: 市净>0则成长收益×2', image: '/static/roles/no8.png',
          selected: false, selectedBy: ''
        },
        {
          id: 9, name: '刺猬', subtitle: '小盘防御', mainFactor: '规模', subFactor: '残差波动',
          skillSummary: '缩壳: 规模改为-3或-4 | 抱团: 残差波动<0则规模收益×2', image: '/static/roles/no9.png',
          selected: false, selectedBy: ''
        },
        {
          id: 10, name: '走钢丝', subtitle: '杠铃策略', mainFactor: '动量', subFactor: '市净',
          skillSummary: '切换: 动量改为最高或最低 | 两端: 市净>0则动量收益×2', image: '/static/roles/no10.png',
          selected: false, selectedBy: ''
        }
      ]
    }
  },
  computed: {
    selectedCount() {
      return this.roles.filter(r => r.selected).length
    },
    remainingCount() {
      return this.roles.filter(r => !r.selected).length
    }
  },
  watch: {
    roleSelectStatus: {
      immediate: true,
      handler(newVal) {
        if (newVal && newVal.length) {
          newVal.forEach(serverRole => {
            const role = this.roles.find(r => r.id === serverRole.id)
            if (role) {
              role.selected = serverRole.selected
              role.selectedBy = serverRole.selectedBy || ''
            }
          })
        }
      }
    },
    timeLeft: {
      immediate: true,
      handler(newVal) {
        if (newVal >= 0) {
          this.countdown = newVal
        }
      }
    }
  },
  mounted() {
    this.startCountdown()
  },
  beforeDestroy() {
    clearInterval(this.timer)
  },
  methods: {
    startCountdown() {
      this.timer = setInterval(() => {
        if (this.countdown > 0) {
          this.countdown--
        } else {
          clearInterval(this.timer)
        }
      }, 1000)
    }
  }
}
</script>

<style>
.role-select-container {
  min-height: 100vh;
  background: #0a0a0f;
  padding: 20px;
  color: #fff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #f0d78c;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 8px;
}

.countdown-label {
  font-size: 14px;
  color: #888;
}

.countdown-time {
  font-size: 24px;
  font-weight: bold;
  color: #ff6b6b;
}

.role-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
}

.role-card {
  width: calc(20% - 12px);
  min-width: 180px;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #333;
  position: relative;
  transition: all 0.3s;
}

.role-card.selected {
  opacity: 0.5;
  border-color: #444;
}

.role-card.disabled {
  pointer-events: none;
}

.role-image {
  width: 100%;
  height: 120px;
  background: #0f0f1a;
}

.role-info {
  padding: 10px;
}

.role-name {
  font-size: 18px;
  font-weight: bold;
  color: #f0d78c;
  display: block;
  margin-bottom: 4px;
}

.role-subtitle {
  font-size: 12px;
  color: #aaa;
  display: block;
  margin-bottom: 8px;
}

.factor-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.factor-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
}

.factor-tag.main {
  background: #e74c3c;
}

.factor-tag.sub {
  background: #3498db;
}

.skill-summary {
  font-size: 10px;
  color: #888;
  line-height: 1.4;
  display: block;
}

.selected-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-text {
  font-size: 24px;
  font-weight: bold;
  color: #2ecc71;
}

.footer {
  margin-top: 20px;
  text-align: center;
  padding: 10px;
}

.footer-text {
  font-size: 16px;
  color: #888;
}
</style>
