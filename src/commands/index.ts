import { Context } from 'koishi'
import { PotionSystem } from '../systems/potion'
import { ExploreSystem } from '../systems/explore'
import { RitualSystem } from '../systems/ritual'
import { TradeSystem } from '../systems/trade'
import { pathways } from '../pathways'
import { apply as registerRecipeCommands } from './recipe'
import { apply as registerPotionCommands } from './potion'
import { InventorySystem } from '../systems/inventory'
import items from '../config/items.json'
import potions from '../config/potions.json'
import rituals from '../config/rituals.json'
import { findItem, findPotion, formatNotFoundError } from '../utils/mapping'
import { Ritual } from '../types/rituals'

declare module 'koishi' {
  interface Events {
    'beyonder/status'(): void
  }
}

export function registerCommands(ctx: Context) {
  const potionSystem = new PotionSystem(ctx)
  const exploreSystem = new ExploreSystem(ctx)
  const ritualSystem = new RitualSystem(ctx)
  const tradeSystem = new TradeSystem(ctx)
  const inventorySystem = new InventorySystem(ctx)

  // 初始化命令
  ctx.command('beyonder')
    .alias('非凡者')
    .usage('非凡者游戏系统')

  // 子命令：初始化
  ctx.command('beyonder.init [pathway:string]', '成为一名非凡者')
    .alias('非凡者.初始化')
    .action(async ({ session }, pathway) => {
      // 检查玩家是否已经初始化
      const existing = await ctx.model.get('beyonder_players', { id: session.userId })
      const player = Array.isArray(existing) ? existing[0] : existing
      
      if (player) {
        return '你已经是一位非凡者了。'
      }

      // 如果没有提供途径，显示可用选项
      if (!pathway) {
        return [
          '请选择你的非凡途径：',
          '可用途径：',
          ...Object.values(pathways).map(p => 
            `${p.name}：${p.description}\n可用别名：${p.aliases.join(', ')}`
          ),
          '\n使用方式：',
          'beyonder init 愚者',
          'beyonder init 太阳'
        ].join('\n')
      }

      // 查找匹配的途径
      const matchedPathway = Object.entries(pathways).find(([key, p]) => 
        p.aliases.some(alias => alias.toLowerCase() === pathway?.toLowerCase())
      )

      if (!matchedPathway) {
        return [
          '无效的途径选择。可用途径：',
          ...Object.values(pathways).map(p => 
            `- ${p.name} (${p.aliases.join(', ')})`
          )
        ].join('\n')
      }

      // 创建新玩家
      await ctx.model.create('beyonder_players', {
        id: session.userId,
        pathway: matchedPathway[0],
        sequence: 9,
        inventory: '{}',
        spirituality: 100,
        sanity: 100,
        acting: 0,
        digestion: 0,
        characteristics: '[]',
        corruption: '[]',
        achievements: '[]',
        recipes: '[]',
        lastRitualTime: 0
      })

      const chosenPathway = pathways[matchedPathway[0]]
      return [
        `恭喜！你已经成为一名${chosenPathway.name}途径的非凡者。`,
        `当前序列：${chosenPathway.sequences[0].name}`,
        `初始特性：${chosenPathway.sequences[0].characteristics.join(', ')}`,
        '\n你可以：',
        '- beyonder status 查看状态',
        '- beyonder explore tingen 探索廷根市',
        '- beyonder potion 制作魔药',
        '- beyonder ritual promote 尝试晋升'
      ].join('\n')
    })

  // 子命令：状态
  ctx.command('beyonder.status', '查看当前状态')
    .action(async ({ session }) => {
      const existing = await ctx.model.get('beyonder_players', { id: session.userId })
      const player = Array.isArray(existing) ? existing[0] : existing
      
      if (!player) {
        return '你还不是非凡者。使用 beyonder.init 来选择一条途径。'
      }

      const pathway = pathways[player.pathway]
      if (!pathway) {
        return '错误：无法找到对应的途径信息'
      }

      const sequence = pathway.sequences.find(s => s.level === player.sequence)
      if (!sequence) {
        return '错误：无法找到对应的序列信息'
      }

      const inventory = JSON.parse(player.inventory)
      const items = Object.entries(inventory)
        .filter(([_, count]) => (count as number) > 0)
        .map(([item, count]) => {
          // 处理魔药显示
          if (item.startsWith('sequence_') && item.endsWith('_potion')) {
            const seq = item.match(/sequence_(\d+)_potion/)?.[1]
            if (seq) {
              const seqInfo = pathway.sequences.find(s => s.level === parseInt(seq))
              return `${seqInfo?.name || `序列${seq}`}魔药x${count}`
            }
          }
          return `${item}x${count}`
        })
        .join(', ')

      return [
        `途径：${pathway.name}`,
        `序列：${sequence.name} (${player.sequence}层)`,
        `灵性：${player.spirituality}`,
        `非凡特性：${sequence.characteristics.join(', ')}`,
        `背包物品：${items || '空'}`
      ].join('\n')
    })

  // 子命令：探索
  ctx.command('beyonder.explore <area:string>', '探索区域')
    .action(async ({ session }, area) => {
      const player = (await ctx.model.get('beyonder_players', { id: session.userId }))[0]
      if (!player) return '你还不是非凡者'
      
      return await exploreSystem.explore(player, area)
    })

  // 交易相关命令
  ctx.command('beyonder.trade', '交易系统')
    .subcommand('list', '查看交易列表')
    .subcommand('sell <item:string> <price:number>', '出售物品')
    .action(async ({ session }) => {
      const trades = await tradeSystem.listMarket()
      if (!trades.length) return '当前市场上没有任何交易'
      
      return trades.map(t => 
        `[${t.id}] ${t.itemId} - ${t.price}金镑`
      ).join('\n')
    })

  // 仪式命令
  ctx.command('beyonder.ritual <type:string>', '举行仪式')
    .example('beyonder.ritual promote - 尝试晋升')
    .action(async ({ session }, type) => {
      const existing = await ctx.model.get('beyonder_players', { id: session.userId })
      const player = Array.isArray(existing) ? existing[0] : existing
      if (!player) return '你还不是非凡者'
      
      // 规范化仪式类型
      const ritualTypes = {
        'promote': '晋升',
        'promotion': '晋升',
        'promot': '晋升',
        '晋升': '晋升'
      }

      const normalizedType = ritualTypes[type.toLowerCase()]
      if (!normalizedType) {
        return [
          '未知的仪式类型。可用的仪式类型：',
          '- promote: 序列晋升'
        ].join('\n')
      }
      
      return await ritualSystem.performRitual(player, 'promote')
    })

  // 测试指令（仅管理员可用）
  ctx.command('beyonder.test <cmd:string> [...args:string]', '测试指令')
    .alias('非凡者测试')
    .userFields(['authority'])
    .action(async ({ session }, cmd, ...args) => {
      // 检查权限
      if (session.user.authority < 3) return '权限不足'

      if (!cmd) {
        return [
          '可用测试指令：',
          'item <物品名> [数量=1] - 添加物品',
          'potion <序列号> [数量=1] - 添加魔药',
          'spirit <数值> - 设置灵性值',
          'sequence <序列号> - 设置序列等级',
          'recipe <potionId> - 学习指定魔药配方',
          'clean - 清理错误物品',
          'reset - 删除当前玩家所有数据'
        ].join('\n')
      }

      const existing = await ctx.model.get('beyonder_players', { id: session.userId })
      const player = Array.isArray(existing) ? existing[0] : existing
      if (!player) return '你还不是非凡者'

      switch (cmd) {
        case 'item': {
          const [itemName, countStr = '1'] = args
          const count = parseInt(countStr)
          
          const item = findItem(itemName)
          if (!item) {
            return formatNotFoundError('物品', Object.values(items))
          }

          const inventory = JSON.parse(player.inventory)
          inventory[item.id] = (inventory[item.id] || 0) + count
          await ctx.model.set('beyonder_players', { id: session.userId }, {
            inventory: JSON.stringify(inventory)
          })
          return `已添加 ${count} ${item.unit} ${item.name}`
        }

        case 'potion': {
          const [nameOrSeq, countStr = '1'] = args
          const count = parseInt(countStr)
          
          let potionId: string
          if (isNaN(parseInt(nameOrSeq))) {
            const potion = findPotion(nameOrSeq)
            if (!potion) {
              return formatNotFoundError('魔药', Object.values(potions))
            }
            potionId = potion.id
          } else {
            potionId = `sequence_${nameOrSeq}_potion`
          }
          
          const inventory = JSON.parse(player.inventory)
          inventory[potionId] = (inventory[potionId] || 0) + count
          await ctx.model.set('beyonder_players', { id: session.userId }, {
            inventory: JSON.stringify(inventory)
          })
          return `已添加 ${count} 瓶 序列${nameOrSeq}魔药`
        }

        case 'spirit': {
          const [value] = args
          await ctx.model.set('beyonder_players', { id: session.userId }, {
            spirituality: parseInt(value)
          })
          return `已设置灵性值为 ${value}`
        }

        case 'sequence': {
          const [seq] = args
          await ctx.model.set('beyonder_players', { id: session.userId }, {
            sequence: parseInt(seq)
          })
          return `已设置序列等级为 ${seq}`
        }

        case 'recipe': {
          const [potionId] = args
          if (!potionId) return '请指定魔药ID'
          const recipes = JSON.parse(player.recipes)
          if (!recipes.includes(potionId)) {
            recipes.push(potionId)
            await ctx.model.set('beyonder_players', { id: session.userId }, {
              recipes: JSON.stringify(recipes)
            })
            return `已学习魔药配方：${potionId}`
          }
          return '已经掌握该配方'
        }

        case 'clean': {
          const inventory = JSON.parse(player.inventory)
          // 清理错误的魔药
          delete inventory['sequence_undefined_potion']
          await ctx.model.set('beyonder_players', { id: session.userId }, {
            inventory: JSON.stringify(inventory)
          })
          return '已清理背包中的错误物品'
        }

        case 'reset': {
          await ctx.model.remove('beyonder_players', { id: session.userId })
          return '已删除你的所有数据，请重新初始化角色'
        }

        default:
          return [
            '未知的测试指令。可用指令：',
            'item <物品名> [数量=1] - 添加物品',
            'potion <序列号> [数量=1] - 添加魔药',
            'spirit <数值> - 设置灵性值',
            'sequence <序列号> - 设置序列等级',
            'recipe <potionId> - 学习指定魔药配方',
            'clean - 清理错误物品',
            'reset - 删除当前玩家所有数据'
          ].join('\n')
      }
    })

  // 注册配方命令
  registerRecipeCommands(ctx)
  
  // 注册魔药命令
  registerPotionCommands(ctx)

  // 子命令：背包
  ctx.command('beyonder.inventory', '查看背包')
    .alias('非凡者.背包')
    .option('detail', '-d 显示物品详情')
    .action(async ({ session, options }) => {
      const player = await ctx.database.get('beyonder_players', { id: session.userId })
      if (!player.length) {
        return '你还不是非凡者。使用 beyonder.init 来选择一条途径。'
      }

      const currentPlayer = player[0]
      
      if (options.detail) {
        const inventory = JSON.parse(currentPlayer.inventory)
        return Object.entries(inventory)
          .filter(([_, count]) => (count as number) > 0)
          .map(([itemId, count]) => {
            const itemDetails = inventorySystem.getItemDetails(itemId)
            return [
              `${inventorySystem.formatItem(itemId, count as number)}`,
              itemDetails,
              ''
            ].join('\n')
          })
          .join('\n')
      }

      return inventorySystem.formatInventory(currentPlayer).join('\n')
    })

  // 图鉴命令
  ctx.command('beyonder.codex [name:string]', '查看图鉴')
    .alias('非凡者.图鉴')
    .option('type', '-t <type:string> 指定类型(item/potion/ritual)', { fallback: 'all' })
    .action(async ({ session, options }, name) => {
      if (!name) {
        // 显示所有可用物品、魔药和仪式列表
        const itemList = Object.values(items).map(i => `- ${i.name}`)
        const potionList = Object.values(potions).map(p => `- ${p.name}`)
        const ritualList = Object.values(rituals).map(r => `- ${r.name}`)
        
        return [
          '物品图鉴：',
          ...itemList,
          '',
          '魔药图鉴：',
          ...potionList,
          '',
          '仪式图鉴：',
          ...ritualList,
          '',
          '使用方法：',
          'beyonder.codex <名称> - 查看指定物品、魔药或仪式的详细信息',
          'beyonder.codex -t item <名称> - 只查看物品',
          'beyonder.codex -t potion <名称> - 只查看魔药',
          'beyonder.codex -t ritual <名称> - 只查看仪式'
        ].join('\n')
      }

      // 根据类型和名称查找
      if (options.type === 'item' || options.type === 'all') {
        const item = Object.values(items).find(i => i.name === name || i.id === name)
        if (item) {
          return [
            `【${item.name}】`,
            `描述：${item.description}`,
            `来源：${item.source.join('、')}`,
            `价值：${item.price}金镑`,
            `单位：${item.unit}`
          ].join('\n')
        }
      }

      if (options.type === 'potion' || options.type === 'all') {
        const potion = Object.values(potions).find(p => p.name === name || p.id === name)
        if (potion) {
          const mainMaterials = potion.mainMaterials
            .map(m => `- ${m.name} x${m.count}${m.unit}`)
            .join('\n')
          const auxMaterials = potion.auxiliaryMaterials
            .map(m => `- ${m.name} x${m.count}${m.unit}`)
            .join('\n')

          return [
            `【${potion.name}】`,
            `描述：${potion.description}`,
            `来源：${potion.source.join('、')}`,
            `价值：${potion.price}金镑`,
            `难度：${Math.round(potion.difficulty * 100)}%`,
            '',
            '主材料：',
            mainMaterials,
            '',
            '辅助材料：',
            auxMaterials
          ].join('\n')
        }
      }

      if (options.type === 'ritual' || options.type === 'all') {
        const ritual = Object.values(rituals).find(r => r.name === name || r.id === name)
        if (ritual) {
          const items = ritual.items ? 
            ritual.items.map(i => `- ${i.name} x${i.count}${i.unit}\n  ${i.description}`).join('\n') :
            '无需特殊物品'

          const specialReq = ritual.special ? 
            `特殊要求：${ritual.special.type === 'divination' ? 
              `需要进行${ritual.special.count}次成功的占卜` : 
              ritual.special.description || ''}` :
            '无特殊要求'

          return [
            `【${ritual.name}】`,
            `描述：${ritual.description}`,
            '',
            '所需物品：',
            items,
            '',
            specialReq
          ].join('\n')
        }
      }

      return '未找到相关物品、魔药或仪式'
    })
}