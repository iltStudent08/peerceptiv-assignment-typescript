export interface CounterBounds {
  min?: number
  max?: number
}

export interface CounterState {
  value: number
  step: number
  label: string
  bounds?: CounterBounds
}

export type CounterAction = 'increment' | 'decrement' | 'reset'

export type CounterConfig = Partial<Omit<CounterState, 'value'>> & {
  initialValue?: number
}
