// 基础类型定义
export interface BeyonderPlayer {
    id: string
    pathway: string
    sequence: number
    spirituality: number
    inventory: string    // { [itemId: string]: number }
    sanity: number
    acting: number
    digestion: number
    characteristics: string  // string[]，存储当前拥有的非凡特性
    corruption: string      // string[]，存储负面特性
    achievements: string    // string[]，存储已完成的成就
    recipes: string         // string[]，存储已掌握的配方
    lastRitualTime: number
  }
  
  export interface PathwayInfo {
    name: string
    description: string
    aliases: string[]
    sequences: SequenceInfo[]
    evolutionPaths?: {
      sequence: number
      to: string
      difficulty: number
      consequences: {
        spiritualityLoss: number
        characteristics: string[]
        sanityDamage?: number
      }
    }[]
  }
  
  export interface SequenceInfo {
    level: number
    name: string
    characteristics: string[]
    potionId?: string
    ritualId?: string
    minSpirituality?: number
    riskOfLoss?: number
  }
  
  export interface Item {
    id: string
    name: string
    type: 'material' | 'potion' | 'ritual' | 'other'
    description: string
    rarity: number
  }

  export interface Trade {
    id: string
    sellerId: string
    itemId: string
    price: number
    status: 'active' | 'completed' | 'cancelled'
    createdAt: number
  }

  export interface Event {
    id: string
    type: 'normal' | 'danger' | 'opportunity'
    title: string
    description: string
    requirements?: {
      sequence?: number
      pathway?: string
      spirituality?: number
    }
    rewards?: {
      items?: Array<{ name: string, chance: number }>
      spirituality?: number
      experience?: number
    }
  }

declare module 'koishi' {
  interface Events {
    'beyonder/sequence-promote'(player: BeyonderPlayer): void
    'beyonder/potion-brew'(player: BeyonderPlayer): void
  }
}

export interface Sequence {
  level: number; // 序列等级 (0-9)
  pathway: Pathway; // 所属途径
  name: string; // 序列名称
  abilities: Ability[]; // 能力列表
  riskOfLoss: number; // 失控风险
  acting: string; // 扮演法要求
  ritual?: string; // 晋升仪式 (序列6以上需要)
}

export interface Pathway {
  id: number;
  name: string; // 途径名称
  group: PathwayGroup; // 所属途径组(如"源堡三途径")
  uniqueness?: UniqueCharacteristic; // 唯一性特性
  godName?: string; // 序列0神名
}

export enum PathwayGroup {
  SourceFortress = "源堡三途径",
  Darkness = "永暗三途径",
  Knowledge = "知识荒野双途径",
  // ... 其他途径组
}

export interface Ability {
  name: string;
  description: string;
  type: AbilityType;
  consumption: number; // 灵性消耗
}

export enum AbilityType {
  Active = "主动",
  Passive = "被动",
  Ritual = "仪式魔法"
}

export interface UniqueCharacteristic {
  name: string;
  description: string;
  effects: string[];
}

export interface Material {
  name: string;
  description: string;
  rarity: number;  // 稀有度
  quantity: number;  // 需求数量
}

export interface Characteristic {
  id: string;
  name: string;
  sequence: number;
  pathway: Pathway;
  source: CharacteristicSource;
}

export enum CharacteristicSource {
  BeyonderDeath = "非凡者死亡",
  SealedArtifact = "封印物",
  Inheritance = "遗传"
}

// 玩家状态
export interface PlayerState extends BeyonderPlayer {}

// 魔药消化状态
export enum DigestionStatus {
  Undigested = '未消化',
  Digesting = '消化中',
  PartiallyDigested = '部分消化',
  FullyDigested = '完全消化'
}

// 失控类型
export enum LossOfControlType {
  None = '正常',
  Minor = '轻微失控',
  Moderate = '中度失控',
  Severe = '严重失控',
  Catastrophic = '灾难性失控'
}

// 物品类型
export enum ItemType {
  Material = '材料',
  Potion = '魔药',
  Artifact = '封印物',
  Consumable = '消耗品'
}

// 物品信息
export interface ItemInfo {
  id: string
  name: string
  type: ItemType
  description: string
  rarity: number      // 稀有度(1-5)
  value: number       // 价值
  effects?: string[]  // 效果
  sequence?: number   // 对应序列(魔药专用)
  pathway?: string    // 对应途径(魔药专用)
}

// 在types/index.ts中添加仪式相关类型
export interface RitualRequirement {
  id: string
  name: string
  description: string
  items?: {
    id: string
    count: number
  }[]
  environment?: {
    time?: string    // 如 "midnight", "fullmoon"
    location?: string // 如 "sea", "church"
    weather?: string  // 如 "storm", "clear"
  }
  special?: {
    type: string     // 如 "kill", "perform", "collect"
    target: string
    count?: number
  }
}

// 添加魔药相关类型
export interface PotionRecipe {
  id: string
  name: string
  sequence: number
  pathway: string
  mainMaterials: {
    id: string
    name: string
    count: number
  }[]
  auxiliaryMaterials: {
    id: string
    name: string
    count: number
    unit: string
  }[]
  difficulty: number // 0-1之间，影响制作成功率
}