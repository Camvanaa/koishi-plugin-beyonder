import { Context } from 'koishi'
import { BeyonderPlayer } from '../types'
import potions from '../config/potions.json'

export class RecipeSystem {
  constructor(private ctx: Context) {}

  async learnRecipe(player: BeyonderPlayer, potionId: string) {
    // 检查配方是否存在
    const potion = potions[potionId]
    if (!potion) {
      return '无效的魔药配方'
    }

    // 检查是否已经学会
    const recipes = JSON.parse(player.recipes)
    if (recipes.includes(potionId)) {
      return '你已经掌握了这个配方'
    }

    // 检查序列要求
    if (player.sequence <= potion.sequence) {
      return '当前序列无法学习该配方'
    }

    // 学习配方
    recipes.push(potionId)
    player.recipes = JSON.stringify(recipes)
    
    // 更新数据库
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      recipes: player.recipes
    })

    return `成功学习了 ${potion.name} 的配方！`
  }

  async hasRecipe(player: BeyonderPlayer, potionId: string): Promise<boolean> {
    const recipes = JSON.parse(player.recipes)
    return recipes.includes(potionId)
  }
}
