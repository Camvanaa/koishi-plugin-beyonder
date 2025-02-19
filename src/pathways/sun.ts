import type { PathwayInfo } from '../types'

export const sunPathway: PathwayInfo = {
  name: '太阳',
  description: '代表着光明、正义、纯洁与审判，是最具攻击性的序列',
  aliases: ['太阳', 'sun', '光之主'],
  sequences: [
    {
      level: 9,
      name: '歌颂者',
      characteristics: [
        '光明祝福',
        '净化之火',
        '圣光感知'
      ],
      potionId: 'sun_9'
    },
    {
      level: 8,
      name: '光之祭司',
      characteristics: [
        '圣光操控',
        '驱邪之力',
        '治愈光环'
      ],
      potionId: 'sun_8'
    },
    // ... 其他序列
  ]
} 