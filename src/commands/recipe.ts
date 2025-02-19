import { Context } from 'koishi'
import potions from '../config/potions.json'
import { BeyonderPlayer } from '../types'
import { RecipeSystem } from '../systems/recipe'
import { findPotion, formatNotFoundError } from '../utils/mapping'

export function apply(ctx: Context) {
  const recipeSystem = new RecipeSystem(ctx)

  ctx.command('beyonder.recipe [potion:string]', '查看魔药配方')
    .option('pathway', '-p <pathway:string> 指定途径')
    .option('sequence', '-s <sequence:number> 指定序列')
    .option('check', '-c 检查是否已学会')
    .action(async ({ options, session }, potionId) => {
      // 获取玩家数据
      const player = await ctx.database.get('beyonder_players', { id: session.userId })
      if (!player.length) {
        return '请先加入游戏'
      }

      const currentPlayer = player[0] as BeyonderPlayer

      // 如果直接指定了魔药ID
      if (potionId) {
        const potion = findPotion(potionId)
        if (!potion) {
          return formatNotFoundError('魔药', Object.values(potions))
        }
        potionId = potion.id
      } else {
        // 使用途径和序列查找
        const pathway = options.pathway || currentPlayer.pathway
        const sequence = options.sequence || currentPlayer.sequence - 1
        potionId = `${pathway}_${sequence}`
      }

      const potion = potions[potionId]
      if (!potion) {
        return '未找到对应的魔药配方'
      }

      // 如果只是检查是否学会
      if (options.check) {
        const hasRecipe = await recipeSystem.hasRecipe(currentPlayer, potionId)
        return hasRecipe ? 
          `你已经掌握了 ${potion.name} 的配方` : 
          `你还没有学会 ${potion.name} 的配方`
      }

      // 检查是否已学会配方
      const hasRecipe = await recipeSystem.hasRecipe(currentPlayer, potionId)
      if (!hasRecipe) {
        return '你还没有学会这个配方'
      }

      // 格式化配方信息
      let response = `${potion.name}的配方：\n\n`
      
      response += '主材料：\n'
      potion.mainMaterials.forEach(material => {
        response += `- ${material.name} x${material.count}${material.unit}\n`
      })

      response += '\n辅助材料：\n'
      potion.auxiliaryMaterials.forEach(material => {
        response += `- ${material.name} x${material.count}${material.unit}\n`
      })

      response += `\n难度：${Math.round(potion.difficulty * 100)}%`

      return response
    })

  // 添加学习配方命令
  ctx.command('beyonder.recipe.learn <sequence:number>', '学习魔药配方')
    .action(async ({ session }, sequence) => {
      const player = await ctx.database.get('beyonder_players', { id: session.userId })
      if (!player.length) {
        return '请先加入游戏'
      }

      const currentPlayer = player[0] as BeyonderPlayer
      const potionId = `${currentPlayer.pathway}_${sequence}`

      return await recipeSystem.learnRecipe(currentPlayer, potionId)
    })
} 