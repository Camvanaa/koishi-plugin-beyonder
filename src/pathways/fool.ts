import type { PathwayInfo } from '../types'

export const foolPathway: PathwayInfo = {
  name: '愚者',
  description: '掌管变化与欺骗，代表着混乱、随机、不确定性和诡秘',
  aliases: ['愚者', 'fool', '诡秘师'],
  sequences: [
    {
      level: 9,
      name: '占卜家',
      characteristics: [
        '占星术',
        '卡牌占卜',
        '灵摆',
        '灵视',
        '预知危险',
        '增强感知'
      ],
      potionId: 'fool_9'
    },
    {
      level: 8,
      name: '小丑',
      characteristics: [
        '技巧型格斗大师',
        '身体协调性提升',
        '力量与敏捷强化',
        '表情控制',
        '飞牌'
      ],
      potionId: 'fool_8'
    },
    {
      level: 7,
      name: '魔术师',
      characteristics: [
        '伤害转移',
        '火焰跳跃',
        '空气弹',
        '纸人替身',
        '操纵火焰',
        '制造幻觉',
        '水下呼吸',
        '骨骼软化',
        '抽纸为兵'
      ],
      potionId: 'fool_7'
    },
    {
      level: 6,
      name: '无面人',
      characteristics: [
        '强化观察力',
        '记忆力提升',
        '改变相貌',
        '变声',
        '完美扮演'
      ],
      potionId: 'fool_6'
    },
    {
      level: 5,
      name: '秘偶大师',
      characteristics: [
        '灵体之线视觉',
        '目标追踪',
        '傀儡操控',
        '思维控制'
      ],
      potionId: 'fool_5',
      ritualId: 'up_fool_5'
    },
    {
      level: 4,
      name: '诡法师',
      characteristics: [
        '动物变形',
        '伤病转移',
        '火焰跳跃增强',
        '空气炮',
        '秘偶能力共享',
        '秘偶位置交换',
        '秘偶生命连接'
      ],
      potionId: 'fool_4',
      ritualId: 'up_fool_4'
    },
    {
      level: 3,
      name: '古代学者',
      characteristics: [
        '借取过往之力',
        '召唤历史影像',
        '纸人部位转移',
        '生物变形进阶'
      ],
      potionId: 'fool_3',
      ritualId: 'up_fool_3'
    },
    {
      level: 2,
      name: '奇迹师',
      characteristics: [
        '历史迷雾操控',
        '灵之虫复活',
        '命运干扰',
        '历史场景召唤',
        '愿望实现'
      ],
      potionId: 'fool_2',
      ritualId: 'up_fool_2'
    }
  ],
  evolutionPaths: [
    {
      sequence: 7,
      to: 'door',
      difficulty: 0.4,
      consequences: {
        spiritualityLoss: 100,
        characteristics: ['精神污染', '疯狂倾向'],
        sanityDamage: 30
      }
    },
    {
      sequence: 6,
      to: 'sun',
      difficulty: 0.2,
      consequences: {
        spiritualityLoss: 150,
        characteristics: ['光明灼烧', '意志污染'],
        sanityDamage: 50
      }
    }
  ]
} 