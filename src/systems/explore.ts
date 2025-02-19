import type { Context } from 'koishi'
import type { BeyonderPlayer, Event } from '../types'
import { randomElement, weightedRandom } from '../utils/random'

export class ExploreSystem {
  private readonly areas = {
    'tingen': {
      name: '廷根市',
      description: '一个充满机遇的港口城市',
      dangerLevel: 1,
      events: [
        {
          id: 'market_visit',
          type: 'normal',
          title: '集市寻宝',
          description: '你在集市上发现了一些有趣的物品...',
          rewards: {
            items: [
              { name: '月光草', chance: 0.6 },
              { name: '大地黄金', chance: 0.4 },
              { name: '占卜铜币', chance: 0.3 }
            ],
            spirituality: 5
          }
        },
        {
          id: 'ghost_encounter',
          type: 'danger',
          title: '幽灵出没',
          description: '你遭遇了一只徘徊的幽灵...',
          requirements: {
            sequence: 9,  // 放宽要求，序列9就可以应对
            spirituality: 50  // 降低灵性要求
          },
          rewards: {
            items: [
              { name: '虚幻之尘', chance: 0.8 }
            ],
            spirituality: 10
          }
        }
      ]
    },
    'bridge': {
      name: '拜朗桥区',
      description: '贫民聚集的危险地区',
      dangerLevel: 2,
      // ... 更多事件
    }
  }

  constructor(private ctx: Context) {}

  async explore(player: BeyonderPlayer, areaId: string) {
    const area = this.areas[areaId]
    if (!area) return '该区域不存在'

    // 生成随机事件
    const event = this.generateEvent(area)
    
    // 检查玩家是否满足事件要求
    if (!this.checkEventRequirements(player, event)) {
      return '这个区域对你来说还太危险了，建议先提升实力。'
    }

    // 处理事件结果
    return await this.handleEvent(player, event)
  }

  private generateEvent(area: any): Event {
    const weights = [0.7, 0.2, 0.1] // 提高普通事件权重
    const eventType = ['normal', 'danger', 'opportunity'][weightedRandom(weights)]
    
    return randomElement(area.events.filter(e => e.type === eventType))
  }

  private checkEventRequirements(player: BeyonderPlayer, event: Event): boolean {
    if (!event.requirements) return true

    const { sequence, pathway, spirituality } = event.requirements
    
    if (sequence && player.sequence > sequence) return false
    if (pathway && player.pathway !== pathway) return false
    if (spirituality && player.spirituality < spirituality) return false

    return true
  }

  private async handleEvent(player: BeyonderPlayer, event: Event) {
    const inventory = JSON.parse(player.inventory)
    let rewards: string[] = []

    // 处理奖励
    if (event.rewards) {
      // 处理物品奖励
      if (event.rewards.items) {
        for (const item of event.rewards.items) {
          if (Math.random() < item.chance) {
            inventory[item.name] = (inventory[item.name] || 0) + 1
            rewards.push(item.name)
          }
        }
      }

      // 处理灵性奖励
      const newSpirituality = player.spirituality + (event.rewards.spirituality || 0)

      // 更新玩家数据
      await this.ctx.model.set('beyonder_players', { id: player.id }, {
        spirituality: newSpirituality,
        inventory: JSON.stringify(inventory)
      })
    }

    return [
      `【${event.title}】`,
      event.description,
      rewards.length ? `\n获得物品：${rewards.join('、')}` : '',
      event.rewards.spirituality ? `\n灵性 +${event.rewards.spirituality}` : ''
    ].filter(Boolean).join('\n')
  }
} 