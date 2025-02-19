import type { PathwayInfo } from '../types'
import { foolPathway } from './fool'
import { sunPathway } from './sun'

// 途径数据
export const pathways: Record<string, PathwayInfo> = {
  fool: foolPathway,
  sun: sunPathway
}

export * from './fool'
export * from './sun'
// ... 其他途径模块导出 