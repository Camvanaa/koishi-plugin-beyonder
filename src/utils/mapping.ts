import items from '../config/items.json'
import potions from '../config/potions.json'
import { pathways } from '../pathways'

// 查找物品
export function findItem(nameOrId: string) {
  return Object.values(items).find(i => 
    i.name === nameOrId || i.id === nameOrId
  )
}

// 查找魔药
export function findPotion(nameOrId: string) {
  return Object.values(potions).find(p => 
    p.name === nameOrId || p.id === nameOrId
  )
}

// 查找途径
export function findPathway(nameOrAlias: string) {
  return Object.entries(pathways).find(([_, p]) => 
    p.name === nameOrAlias || p.aliases.includes(nameOrAlias)
  )
}

// 获取序列信息
export function findSequence(pathway: string, nameOrLevel: string | number) {
  const p = pathways[pathway]
  if (!p) return null
  
  if (typeof nameOrLevel === 'number') {
    return p.sequences.find(s => s.level === nameOrLevel)
  }
  
  return p.sequences.find(s => s.name === nameOrLevel)
}

// 格式化错误提示
export function formatNotFoundError(type: string, items: any[]) {
  return [
    `未找到该${type}。可用${type}：`,
    ...items.map(i => `${i.name} (${i.id || i.aliases?.join(', ')})`)
  ].join('\n')
} 