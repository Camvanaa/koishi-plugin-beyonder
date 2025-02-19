import type { BeyonderPlayer } from './index'

export interface Acting {
  beyonder: BeyonderPlayer;
  actingProgress: number; // 扮演进度(0-100)
  digestionStatus: DigestionStatus; // 消化状态
  mentalState: number; // 精神状态(0-100)
  physicalState: number; // 生理状态(0-100)
}

export enum DigestionStatus {
  Undigested = "未消化",
  Digesting = "消化中",
  PartiallyDigested = "部分消化", 
  FullyDigested = "完全消化"
}

export interface LossOfControl {
  risk: number; // 失控风险
  type: LossOfControlType;
  effects: string[];
  duration: number;
}

export enum LossOfControlType {
  Temporary = "临时失控",
  Permanent = "永久失控",
  Catastrophic = "灾难性失控"
}
