import { Context, Schema } from 'koishi'
import { registerCommands } from './commands'
import { Trade, BeyonderPlayer } from './types'

declare module 'koishi' {
  interface Tables {
    beyonder_trades: Trade
    beyonder_players: BeyonderPlayer
  }
}

export const name = 'beyonder'

// 定义基础配置接口
export interface Config {
  // 序列魔药配方获取难度系数
  potionDifficulty: number
  // 非凡特性互相影响概率
  sequenceConflictRate: number
  // 是否启用意外事件系统
  enableAccidents: boolean
}

// 配置模式
export const Config: Schema<Config> = Schema.object({
  potionDifficulty: Schema.number().default(1.0).description('序列魔药配方获取难度系数'),
  sequenceConflictRate: Schema.number().default(0.3).description('非凡特性互相影响概率'),
  enableAccidents: Schema.boolean().default(true).description('是否启用意外事件系统'),
})

export const inject = {
  required: ['database'],
  optional: ['cron']
}

// 主要功能实现
export function apply(ctx: Context) {
  // 注册数据库表
  ctx.model.extend('beyonder_players', {
    id: 'string',
    pathway: 'string',
    sequence: 'integer',
    spirituality: 'integer',
    inventory: 'string',
    sanity: 'integer',
    acting: 'integer',
    digestion: 'integer',
    characteristics: 'string',
    corruption: 'string',
    achievements: 'string',
    recipes: 'string',
    lastRitualTime: 'integer'
  })

  // 注册数据库表
  ctx.model.extend('beyonder_trades', {
    id: 'string',
    sellerId: 'string',
    itemId: 'string',
    price: 'integer',
    status: 'string',
    createdAt: 'integer'
  })

  // 注册命令
  registerCommands(ctx)
}
