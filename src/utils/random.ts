export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function weightedRandom(weights: number[]): number {
  const sum = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * sum
  
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) return i
    random -= weights[i]
  }
  
  return weights.length - 1
} 