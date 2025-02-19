import type { Context } from 'koishi'
import type { BeyonderPlayer, PlayerState, PathwayInfo, SequenceInfo, LossOfControlType } from '../types'
import { randomInt } from '../utils/random'
import rituals from '../config/rituals.json'

export class RitualSystem {
  constructor(private ctx: Context) {}

  async performRitual(player: BeyonderPlayer, ritualType: string) {
    switch (ritualType) {
      case 'promote':
        return await this.handlePromoteRitual(player)
      default:
        return '未知的仪式类型'
    }
  }

  private async handlePromoteRitual(player: BeyonderPlayer) {
    // 检查是否可以晋升
    if (player.sequence <= 0) {
      return '你已经达到了最高序列'
    }

    // 检查魔药
    const inventory = JSON.parse(player.inventory)
    const potionName = `sequence_${player.sequence - 1}_potion`
    
    if (!inventory[potionName] || inventory[potionName] <= 0) {
      return `你需要一瓶序列${player.sequence - 1}魔药才能进行晋升仪式`
    }

    // 计算成功率
    const successRate = 0.7 + (player.spirituality * 0.001)
    
    // 执行晋升
    if (Math.random() < successRate) {
      // 消耗魔药
      inventory[potionName]--
      
      // 更新玩家数据
      await this.ctx.model.set('beyonder_players', { id: player.id }, {
        sequence: player.sequence - 1,
        inventory: JSON.stringify(inventory),
        spirituality: player.spirituality + 20
      })

      return '晋升仪式成功！你的序列提升了！'
    } else {
      // 失败处理
      inventory[potionName]--
      await this.ctx.model.set('beyonder_players', { id: player.id }, {
        inventory: JSON.stringify(inventory),
        spirituality: Math.max(0, player.spirituality - randomInt(30, 50))
      })

      return '晋升仪式失败，你受到了污染...'
    }
  }

  // 检查是否可以进行晋升仪式
  static canPerformRitual(player: PlayerState, pathway: PathwayInfo): { 
    can: boolean, 
    reason?: string 
  } {
    // 获取当前序列信息
    const currentSequence = pathway.sequences.find(s => s.level === player.sequence)
    if (!currentSequence) {
      return { can: false, reason: '无法获取当前序列信息' }
    }

    // 获取目标序列信息
    const targetSequence = pathway.sequences.find(s => s.level === player.sequence - 1)
    if (!targetSequence) {
      return { can: false, reason: '已达到最高序列' }
    }

    // 检查灵性要求
    if (targetSequence.minSpirituality && player.spirituality < targetSequence.minSpirituality) {
      return { 
        can: false, 
        reason: `灵性不足，需要${targetSequence.minSpirituality}点灵性` 
      }
    }

    // 检查魔药消化进度
    if (player.digestion < 100) {
      return { 
        can: false, 
        reason: `当前序列魔药尚未完全消化（${player.digestion}%）` 
      }
    }

    // 检查扮演进度
    if (player.acting < 80) {
      return { 
        can: false, 
        reason: `扮演进度不足（${player.acting}%），需要至少80%` 
      }
    }

    // 检查理智状态
    if (player.sanity < 50) {
      return { 
        can: false, 
        reason: `理智状态不佳（${player.sanity}），需要至少50点理智` 
      }
    }

    // 检查晋升CD
    const now = Date.now()
    const cooldown = 24 * 60 * 60 * 1000 // 24小时
    if (player.lastRitualTime && (now - player.lastRitualTime) < cooldown) {
      const remainingHours = Math.ceil((cooldown - (now - player.lastRitualTime)) / (60 * 60 * 1000))
      return { 
        can: false, 
        reason: `距离上次仪式时间不足24小时，还需等待${remainingHours}小时` 
      }
    }

    return { can: true }
  }

  // 计算晋升成功率
  static calculateSuccessRate(player: PlayerState, pathway: PathwayInfo): number {
    const targetSequence = pathway.sequences.find(s => s.level === player.sequence - 1)
    if (!targetSequence) return 0

    let baseRate = 0.5 // 基础成功率50%
    
    // 扮演进度加成 (最高20%)
    baseRate += (player.acting - 80) * 0.01

    // 灵性加成 (每超过要求10点增加5%，最高20%)
    if (targetSequence.minSpirituality) {
      const spiritualityBonus = Math.min(
        ((player.spirituality - targetSequence.minSpirituality) / 10) * 0.05,
        0.2
      )
      baseRate += spiritualityBonus
    }

    // 理智加成 (最高10%)
    baseRate += ((player.sanity - 50) / 100) * 0.1

    // 失控风险降低成功率
    if (targetSequence.riskOfLoss) {
      baseRate -= targetSequence.riskOfLoss * 0.2
    }

    // 确保成功率在5%-95%之间
    return Math.min(Math.max(baseRate, 0.05), 0.95)
  }

  // 检查仪式要求
  static checkRitualRequirements(player: PlayerState, pathway: PathwayInfo): {
    fulfilled: boolean
    requirements: string[]
    missing: string[]
  } {
    const targetSequence = pathway.sequences.find(s => s.level === player.sequence - 1)
    if (!targetSequence || !targetSequence.ritualId) {
      return {
        fulfilled: true,
        requirements: [],
        missing: []
      }
    }

    const ritual = rituals[targetSequence.ritualId]
    if (!ritual) {
      return {
        fulfilled: false,
        requirements: [],
        missing: ['无效的仪式ID']
      }
    }

    const missing: string[] = []
    const requirements: string[] = []

    // 检查物品需求
    if (ritual.items) {
      const inventory = JSON.parse(player.inventory)
      ritual.items.forEach(item => {
        requirements.push(`需要 ${item.count}个 ${item.id}`)
        if (!inventory[item.id] || inventory[item.id] < item.count) {
          missing.push(`缺少物品：${item.id} (需要${item.count}个)`)
        }
      })
    }

    // 检查环境需求
    if (ritual.environment) {
      const env = ritual.environment
      if (env.time) {
        requirements.push(`需要特定时间：${env.time}`)
        // TODO: 实现时间检查
        missing.push(`需要等待特定时间：${env.time}`)
      }
      if (env.location) {
        requirements.push(`需要特定地点：${env.location}`)
        // TODO: 实现地点检查
        missing.push(`需要前往特定地点：${env.location}`)
      }
      if (env.weather) {
        requirements.push(`需要特定天气：${env.weather}`)
        // TODO: 实现天气检查
        missing.push(`需要特定天气：${env.weather}`)
      }
    }

    // 检查特殊条件
    if (ritual.special) {
      requirements.push(`需要完成特殊条件：${ritual.special.type} ${ritual.special.target}`)
      // TODO: 实现特殊条件检查
      missing.push(`需要完成：${ritual.special.type} ${ritual.special.target}`)
    }

    return {
      fulfilled: missing.length === 0,
      requirements,
      missing
    }
  }

  // 修改执行晋升仪式方法
  static async performRitual(player: PlayerState, pathway: PathwayInfo): Promise<{
    success: boolean
    message: string
    consequences?: string[]
  }> {
    // 1. 检查基本条件
    const basicCheck = this.canPerformRitual(player, pathway)
    if (!basicCheck.can) {
      return {
        success: false,
        message: basicCheck.reason || '无法进行晋升仪式'
      }
    }

    // 2. 检查仪式要求（如果有）
    const targetSequence = pathway.sequences.find(s => s.level === player.sequence - 1)
    if (targetSequence?.ritualId) {
      const ritualCheck = this.checkRitualRequirements(player, pathway)
      if (!ritualCheck.fulfilled) {
        return {
          success: false,
          message: '仪式要求未满足',
          consequences: ritualCheck.missing
        }
      }
    }

    // 3. 检查魔药
    const inventory = JSON.parse(player.inventory)
    const potionName = `sequence_${player.sequence - 1}_potion`
    if (!inventory[potionName] || inventory[potionName] <= 0) {
      return {
        success: false,
        message: `缺少序列${player.sequence - 1}魔药`,
        consequences: [`需要一瓶${targetSequence?.name || ''}魔药`]
      }
    }

    // 4. 执行仪式并消耗物品
    if (targetSequence?.ritualId) {
      const ritual = rituals[targetSequence.ritualId]
      // 消耗仪式所需物品
      if (ritual.items) {
        ritual.items.forEach(item => {
          inventory[item.id] -= item.count
        })
      }
    }

    // 5. 消耗魔药
    inventory[potionName]--

    // 6. 计算成功率和结果
    const successRate = this.calculateSuccessRate(player, pathway)
    const roll = Math.random()
    const success = roll <= successRate

    // 7. 处理结果
    const consequences: string[] = []
    
    if (success) {
      consequences.push(`晋升仪式成功！（成功率：${Math.round(successRate * 100)}%）`)
      consequences.push(`你已经成为序列${player.sequence - 1}：${targetSequence?.name}`)
      
      // 更新玩家状态
      player.sequence -= 1
      player.digestion = 0
      player.acting = 0
      player.lastRitualTime = Date.now()
      
      // 消耗灵性
      const spiritualityLoss = Math.floor(player.spirituality * 0.2)
      player.spirituality -= spiritualityLoss
      consequences.push(`消耗了${spiritualityLoss}点灵性`)

      // 更新特性
      const characteristics = JSON.parse(player.characteristics)
      characteristics.push(...targetSequence.characteristics)
      player.characteristics = JSON.stringify(characteristics)
    } else {
      consequences.push(`晋升仪式失败！（成功率：${Math.round(successRate * 100)}%）`)
      
      // 计算失败后果
      const severity = Math.random()
      if (severity > 0.7) {
        // 严重失败
        const spiritualityLoss = Math.floor(player.spirituality * 0.4)
        player.spirituality -= spiritualityLoss
        player.sanity -= 30
        consequences.push(`失去${spiritualityLoss}点灵性`)
        consequences.push('理智受到严重创伤（-30）')
        consequences.push('获得了一个负面特性：仪式创伤')
        const corruptions = JSON.parse(player.corruption)
        corruptions.push('仪式创伤')
        player.corruption = JSON.stringify(corruptions)
      } else {
        // 一般失败
        const spiritualityLoss = Math.floor(player.spirituality * 0.2)
        player.spirituality -= spiritualityLoss
        player.sanity -= 15
        consequences.push(`失去${spiritualityLoss}点灵性`)
        consequences.push('理智受到创伤（-15）')
      }
    }

    // 8. 更新物品栏
    player.inventory = JSON.stringify(inventory)

    return {
      success,
      message: success ? '晋升成功！' : '晋升失败！',
      consequences
    }
  }

  private async handlePromoteSuccess(player: BeyonderPlayer, targetSequence: SequenceInfo) {
    // 更新特性
    const characteristics = JSON.parse(player.characteristics)
    characteristics.push(...targetSequence.characteristics)
    player.characteristics = JSON.stringify(characteristics)

    // 其他更新...
  }

  private async handlePromoteFail(player: BeyonderPlayer, severity: 'normal' | 'severe') {
    if (severity === 'severe') {
      const corruptions = JSON.parse(player.corruption)
      corruptions.push('仪式创伤')
      player.corruption = JSON.stringify(corruptions)
    }
    // 其他处理...
  }
} 