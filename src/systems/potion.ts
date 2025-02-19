import type { Context } from 'koishi'
import type { BeyonderPlayer, Pathway, Material, Characteristic, PlayerState } from '../types'
import { pathways } from '../pathways'
import { randomInt } from '../utils/random'
import potions from '../config/potions.json'

export class PotionSystem {
  constructor(private ctx: Context) {}

  async brew(player: BeyonderPlayer, ingredients: string[]) {
    // 检查材料
    if (!await this.checkIngredients(player, ingredients)) {
      return '材料不足'
    }

    // 获取当前序列的魔药配方
    const pathway = pathways[player.pathway]
    const sequence = pathway.sequences.find(s => s.level === player.sequence)
    
    if (!sequence) {
      return '无法找到对应序列的魔药配方'
    }

    // 获取魔药配方
    if (!sequence.potionId || !potions[sequence.potionId]) {
      return '无法找到对应的魔药配方'
    }

    const potion = potions[sequence.potionId]
    // 检查配方是否正确
    if (!this.checkRecipe(ingredients, [...potion.mainMaterials, ...potion.auxiliaryMaterials])) {
      return '配方错误，魔药制作失败'
    }

    // 计算成功率
    const successRate = this.calculateSuccess(player)
    const roll = Math.random()

    if (roll > successRate) {
      // 失败后果处理
      await this.handleFailure(player)
      return '魔药制作失败，你受到了污染！'
    }

    // 成功制作魔药
    await this.consumeIngredients(player, ingredients)
    await this.addPotion(player, sequence.level)
    
    return `成功制作了序列${sequence.level}的魔药：${sequence.name}`
  }

  private async checkIngredients(player: BeyonderPlayer, ingredients: string[]) {
    const inventory = JSON.parse(player.inventory)
    return ingredients.every(item => inventory[item] > 0)
  }

  private checkRecipe(ingredients: string[], recipe: string[]) {
    if (ingredients.length !== recipe.length) return false
    return ingredients.every(item => recipe.includes(item))
  }

  private calculateSuccess(player: BeyonderPlayer) {
    // 基础成功率 0.7
    let rate = 0.7
    // 灵性越高成功率越高
    rate += player.spirituality * 0.001
    // 随机波动
    rate += randomInt(-10, 10) * 0.01
    
    return Math.min(Math.max(rate, 0.1), 0.9)
  }

  private async handleFailure(player: BeyonderPlayer) {
    // 失败惩罚：降低灵性
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      spirituality: Math.max(0, player.spirituality - randomInt(10, 30))
    })
  }

  private async consumeIngredients(player: BeyonderPlayer, ingredients: string[]) {
    const inventory = JSON.parse(player.inventory)
    ingredients.forEach(item => inventory[item]--)
    
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      inventory: JSON.stringify(inventory)
    })
  }

  private async addPotion(player: BeyonderPlayer, sequence: number) {
    const inventory = JSON.parse(player.inventory)
    const potionName = `sequence_${sequence}_potion`
    inventory[potionName] = (inventory[potionName] || 0) + 1
    
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      inventory: JSON.stringify(inventory)
    })
  }

  // 检查是否可以制作魔药
  canBrewPotion(player: BeyonderPlayer, potionId: string): {
    can: boolean
    reason?: string
  } {
    const potion = potions[potionId]
    if (!potion) {
      return { can: false, reason: '无效的魔药配方' }
    }

    // 检查序列要求
    if (player.sequence <= potion.sequence) {
      return { can: false, reason: '当前序列无法制作该魔药' }
    }

    // 检查材料
    const inventory = JSON.parse(player.inventory)
    
    // 检查主材料
    for (const material of potion.mainMaterials) {
      if (!inventory[material.id] || inventory[material.id] < material.count) {
        return { 
          can: false, 
          reason: `缺少主材料：${material.name} (需要${material.count}${material.unit})` 
        }
      }
    }

    // 检查辅助材料
    for (const material of potion.auxiliaryMaterials) {
      if (!inventory[material.id] || inventory[material.id] < material.count) {
        return { 
          can: false, 
          reason: `缺少辅助材料：${material.name} (需要${material.count}${material.unit})` 
        }
      }
    }

    return { can: true }
  }

  // 制作魔药
  async brewPotion(player: BeyonderPlayer, potionId: string): Promise<{
    success: boolean
    message: string
    consequences?: string[]
  }> {
    // 检查制作条件
    const check = this.canBrewPotion(player, potionId)
    if (!check.can) {
      return {
        success: false,
        message: check.reason || '无法制作魔药'
      }
    }

    const potion = potions[potionId]
    const inventory = JSON.parse(player.inventory)
    const consequences: string[] = []

    // 消耗材料
    for (const material of [...potion.mainMaterials, ...potion.auxiliaryMaterials]) {
      inventory[material.id] -= material.count
      consequences.push(`消耗 ${material.name} x${material.count}${material.unit}`)
    }

    // 计算成功率
    const baseRate = 1 - potion.difficulty
    const spiritualityBonus = player.spirituality * 0.001
    const successRate = Math.min(Math.max(baseRate + spiritualityBonus, 0.1), 0.9)

    // 判定结果
    const success = Math.random() < successRate
    if (success) {
      // 添加魔药到背包
      const potionItemId = `sequence_${potion.sequence}_potion`
      inventory[potionItemId] = (inventory[potionItemId] || 0) + 1
      consequences.push(`获得 ${potion.name} x1`)
    } else {
      consequences.push('魔药制作失败')
      // 可能造成污染
      if (Math.random() < 0.3) {
        player.sanity -= 10
        consequences.push('受到轻微污染，理智-10')
      }
    }

    // 更新背包
    player.inventory = JSON.stringify(inventory)

    return {
      success,
      message: success ? '魔药制作成功！' : '魔药制作失败！',
      consequences
    }
  }
}

export interface Potion {
  sequence: number;
  pathway: Pathway;
  mainMaterial: Characteristic; // 主材料(非凡特性)
  auxiliaryMaterials: Material[]; // 辅助材料
  preparation: string; // 配置方法
  sideEffects: string[]; // 副作用
}