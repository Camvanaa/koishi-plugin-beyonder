import { Context } from 'koishi'
import { BeyonderPlayer } from '../types'
import items from '../config/items.json'
import potions from '../config/potions.json'
import { pathways } from '../pathways'

export class InventorySystem {
  constructor(private ctx: Context) {}

  // 添加物品
  async addItem(player: BeyonderPlayer, itemId: string, count: number = 1) {
    const inventory = JSON.parse(player.inventory)
    inventory[itemId] = (inventory[itemId] || 0) + count
    player.inventory = JSON.stringify(inventory)
    
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      inventory: player.inventory
    })
  }

  // 移除物品
  async removeItem(player: BeyonderPlayer, itemId: string, count: number = 1) {
    const inventory = JSON.parse(player.inventory)
    if (!inventory[itemId] || inventory[itemId] < count) {
      return false
    }
    
    inventory[itemId] -= count
    if (inventory[itemId] <= 0) {
      delete inventory[itemId]
    }
    
    player.inventory = JSON.stringify(inventory)
    await this.ctx.model.set('beyonder_players', { id: player.id }, {
      inventory: player.inventory
    })
    return true
  }

  // 检查物品数量
  getItemCount(player: BeyonderPlayer, itemId: string): number {
    const inventory = JSON.parse(player.inventory)
    return inventory[itemId] || 0
  }

  // 格式化物品显示
  formatItem(itemId: string, count: number): string {
    // 处理魔药显示
    if (itemId.startsWith('sequence_') && itemId.endsWith('_potion')) {
      const seq = itemId.match(/sequence_(\d+)_potion/)?.[1]
      if (seq) {
        return `序列${seq}魔药 x${count}瓶`
      }
    }

    // 处理普通物品显示
    const item = items[itemId] || Object.values(items).find(i => i.name === itemId)
    if (!item) {
      // 处理魔药ID
      const potion = potions[itemId]
      if (potion) {
        return `${potion.name} x${count}瓶`
      }
      return `未知物品(${itemId}) x${count}`
    }
    return `${item.name} x${count}${item.unit}`
  }

  // 获取物品信息
  getItemInfo(itemId: string) {
    return items[itemId]
  }

  // 格式化背包显示
  formatInventory(player: BeyonderPlayer): string[] {
    const inventory = JSON.parse(player.inventory)
    const itemList = Object.entries(inventory)
      .filter(([_, count]) => (count as number) > 0)
      .map(([itemId, count]) => this.formatItem(itemId, count as number))

    if (itemList.length === 0) {
      return ['背包是空的']
    }

    return [
      '背包物品：',
      ...itemList.map(item => `- ${item}`)
    ]
  }

  // 获取物品详细信息
  getItemDetails(itemId: string): string {
    // 处理魔药显示
    if (itemId.startsWith('sequence_') && itemId.endsWith('_potion')) {
      const seq = itemId.match(/sequence_(\d+)_potion/)?.[1]
      if (seq) {
        return [
          `名称：序列${seq}魔药`,
          '描述：非凡特性魔药',
          '来源：制作',
          '价值：1000金镑'
        ].join('\n')
      }
    }

    // 处理普通物品显示
    const item = items[itemId] || Object.values(items).find(i => i.name === itemId)
    if (!item) {
      // 处理魔药ID
      const potion = potions[itemId]
      if (potion) {
        return [
          `名称：${potion.name}`,
          `描述：${potion.description}`,
          `来源：${potion.source.join('、')}`,
          `价值：${potion.price}金镑`,
          `难度：${Math.round(potion.difficulty * 100)}%`
        ].join('\n')
      }
      return `未知物品(${itemId})`
    }
    
    return [
      `名称：${item.name}`,
      `描述：${item.description}`,
      `来源：${item.source.join('、')}`,
      `价值：${item.price}金镑`
    ].join('\n')
  }
} 