import type { Context } from 'koishi'
import type { BeyonderPlayer } from '../types'

interface Achievement {
  id: string
  name: string
  description: string
  condition: (player: BeyonderPlayer) => Promise<boolean>
  reward?: {
    spirituality?: number
    items?: string[]
  }
}

export class AchievementSystem {
  private achievements: Achievement[] = [
    {
      id: 'first_potion',
      name: '初次调配',
      description: '成功制作第一瓶魔药',
      condition: async (player) => {
        const inventory = JSON.parse(player.inventory)
        return Object.keys(inventory).some(item => item.includes('potion'))
      },
      reward: {
        spirituality: 20
      }
    },
    {
      id: 'sequence_8',
      name: '超凡入圣',
      description: '成功晋升至序列8',
      condition: async (player) => player.sequence <= 8,
      reward: {
        spirituality: 50,
        items: ['神秘礼盒']
      }
    },
    // ... 更多成就
  ]

  constructor(private ctx: Context) {
    this.registerListeners()
  }

  private registerListeners() {
    // 监听序列晋升事件
    this.ctx.on('beyonder/sequence-promote', async (player) => {
      await this.checkAchievements(player)
    })

    // 监听魔药制作事件
    this.ctx.on('beyonder/potion-brew', async (player) => {
      await this.checkAchievements(player)
    })
  }

  async checkAchievements(player: BeyonderPlayer) {
    const completedAchievements = JSON.parse(player.achievements || '[]')
    
    for (const achievement of this.achievements) {
      // 跳过已完成的成就
      if (completedAchievements.includes(achievement.id)) continue

      // 检查成就条件
      if (await achievement.condition(player)) {
        await this.grantAchievement(player, achievement)
      }
    }
  }

  private async grantAchievement(player: BeyonderPlayer, achievement: Achievement) {
    // 更新已完成成就列表
    const completedAchievements = JSON.parse(player.achievements || '[]')
    completedAchievements.push(achievement.id)

    // 应用奖励
    if (achievement.reward) {
      const inventory = JSON.parse(player.inventory)
      if (achievement.reward.items) {
        achievement.reward.items.forEach(item => {
          inventory[item] = (inventory[item] || 0) + 1
        })
      }

      await this.ctx.model.set('beyonder_players', { id: player.id }, {
        achievements: JSON.stringify(completedAchievements),
        spirituality: player.spirituality + (achievement.reward.spirituality || 0),
        inventory: JSON.stringify(inventory)
      })
    }

    // 发送成就通知
    await this.ctx.broadcast([player.id], 
      `🏆 解锁成就：${achievement.name}\n${achievement.description}`
    )
  }

  // 查看成就列表
  async listAchievements(player: BeyonderPlayer) {
    const completedAchievements = JSON.parse(player.achievements || '[]')
    
    return this.achievements.map(a => ({
      name: a.name,
      description: a.description,
      completed: completedAchievements.includes(a.id)
    }))
  }

  async addAchievement(player: BeyonderPlayer, achievementId: string) {
    const achievements = JSON.parse(player.achievements)
    if (!achievements.includes(achievementId)) {
      achievements.push(achievementId)
      player.achievements = JSON.stringify(achievements)
      
      // 更新数据库
      await this.ctx.model.set('beyonder_players', { id: player.id }, {
        achievements: player.achievements
      })
    }
  }
}