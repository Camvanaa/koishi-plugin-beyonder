import type { Context } from 'koishi'
import type { BeyonderPlayer } from '../types'
import { pathways } from '../pathways'
import { randomInt } from '../utils/random'

export class SequenceSystem {
  constructor(private ctx: Context) {}

  async promote(player: BeyonderPlayer) {
    // 检查是否可以晋升
    if (player.sequence <= 0) {
      return '你已经达到了最高序列'
    }

    const pathway = pathways[player.pathway]
    const currentSequence = pathway.sequences.find(s => s.level === player.sequence)
    const nextSequence = pathway.sequences.find(s => s.level === player.sequence - 1)

    if (!currentSequence || !nextSequence) {
      return '序列信息错误'
    }

    // 检查物品栏中是否有对应序列魔药
    const inventory = JSON.parse(player.inventory)
    const potionName = `sequence_${player.sequence - 1}_potion`
    if (!inventory[potionName]) {
      return `缺少${nextSequence.name}魔药`
    }

    // 计算晋升成功率
    const successRate = this.calculatePromoteSuccess(player)
    const roll = Math.random()

    if (roll > successRate) {
      // 失败处理
      await this.handlePromoteFail(player)
      return '晋升仪式失败，你受到了严重的污染！'
    }

    // 成功晋升
    await this.handlePromoteSuccess(player, nextSequence)
    return `恭喜！你成功晋升为${nextSequence.name}`
  }

  private calculatePromoteSuccess(player: BeyonderPlayer): number {
    // 基础成功率
    let rate = 0.5
    // 灵性影响
    rate += player.spirituality * 0.001
    // 序列等级影响（序列越高越容易）
    rate += (player.sequence - 1) * 0.05
    
    return Math.min(Math.max(rate, 0.1), 0.9)
  }

  private async handlePromoteFail(player: BeyonderPlayer) {
    // 扣除魔药
    const inventory = JSON.parse(player.inventory)
    const potionName = `sequence_${player.sequence - 1}_potion`
    inventory[potionName]--
    
    // 降低灵性
    const spiritualityLoss = randomInt(30, 50)
    
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      inventory: JSON.stringify(inventory),
      spirituality: Math.max(0, player.spirituality - spiritualityLoss)
    })
  }

  private async handlePromoteSuccess(player: BeyonderPlayer, nextSequence: any) {
    // 扣除魔药
    const inventory = JSON.parse(player.inventory)
    const potionName = `sequence_${player.sequence - 1}_potion`
    inventory[potionName]--
    
    // 更新玩家数据
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      sequence: player.sequence - 1,
      inventory: JSON.stringify(inventory)
    })

    // 触发成就检查
    await this.ctx.emit('beyonder/sequence-promote', player)
  }
} 