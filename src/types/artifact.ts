import type { Pathway } from './index'

export interface SealedArtifact {
  id: string;
  name: string;
  level: number; // 0-3级
  sequence: number;
  pathway: Pathway;
  effects: Effect[];
  sideEffects: Effect[];
  restrictions: string[]; // 使用限制
}

export interface Effect {
  name: string;
  description: string;
  duration: number;
  probability: number; // 触发概率
}
