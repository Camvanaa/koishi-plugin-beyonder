import { Context } from 'koishi'
import potions from '../config/potions.json'
import { PotionSystem } from '../systems/potion'
import { BeyonderPlayer } from '../types'
import { RecipeSystem } from '../systems/recipe'
import { findPotion, formatNotFoundError } from '../utils/mapping'

export function apply(ctx: Context) {
  const potionSystem = new PotionSystem(ctx)
  const recipeSystem = new RecipeSystem(ctx)

  const cmd = ctx.command('beyonder.potion', '魔药系统')
    .action(async ({ session }) => {
      return [
        '魔药系统指令：',
        'brew [魔药ID] - 制作指定魔药',
        'brew -w <途径> -s <序列> - 使用途径和序列制作魔药',
        'list - 查看当前可制作的魔药列表'
      ].join('\n')
    })

  // 制作魔药
  cmd.subcommand('.brew [potion:string]', '制作魔药')
    .option('pathway', '-w <pathway:string> 指定途径')
    .option('sequence', '-s <sequence:number> 指定序列')
    .action(async ({ options, session }, potionId) => {
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

      // 检查是否已学会配方
      const hasRecipe = await recipeSystem.hasRecipe(currentPlayer, potionId)
      if (!hasRecipe) {
        return '你还没有学会这个配方'
      }
      
      // 检查并制作魔药
      const result = await potionSystem.brewPotion(currentPlayer, potionId)
      
      // 如果成功，更新数据库
      if (result.success) {
        await ctx.database.set('beyonder_players', { id: session.userId }, {
          inventory: currentPlayer.inventory,
          sanity: currentPlayer.sanity
        })
      }

      // 返回结果
      return [
        result.message,
        ...(result.consequences || [])
      ].join('\n')
    })

  // 查看可制作的魔药列表
  cmd.subcommand('.list', '查看可制作的魔药列表')
    .action(async ({ session }) => {
      const player = await ctx.database.get('beyonder_players', { id: session.userId })
      if (!player.length) {
        return '请先加入游戏'
      }

      const currentPlayer = player[0] as BeyonderPlayer
      const recipes = JSON.parse(currentPlayer.recipes)
      
      if (!recipes.length) {
        return '你还没有学会任何魔药配方'
      }

      const availablePotions = recipes.map(id => potions[id])
        .filter(potion => potion && potion.pathway === currentPlayer.pathway)

      return [
        '可制作的魔药列表：',
        ...availablePotions.map(potion => {
          const check = potionSystem.canBrewPotion(currentPlayer, potion.id)
          return `${potion.name} (序列${potion.sequence})${check.can ? '' : ` - ${check.reason}`}`
        })
      ].join('\n')
    })
} 