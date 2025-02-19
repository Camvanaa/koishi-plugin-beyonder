export interface Ritual {
    id: string
    name: string
    description: string
    items?: {
      id: string
      name: string
      count: number
      unit?: string
      description?: string
    }[]
    special?: {
      type: string
      count?: number
      target?: string
      duration?: string
      requirements?: string[]
    }
    environment?: {
      time?: string
      location?: string
      special?: string
    }
  }