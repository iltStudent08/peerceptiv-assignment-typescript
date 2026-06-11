import type { CounterAction, CounterBounds, CounterConfig, CounterState } from '../types/counter'

const clampValue = (value: number, bounds?: CounterBounds): number => {
  const min = bounds?.min ?? Number.NEGATIVE_INFINITY
  const max = bounds?.max ?? Number.POSITIVE_INFINITY
  return Math.min(max, Math.max(min, value))
}

const createInitialState = (config: CounterConfig = {}): CounterState => {
  const { initialValue = 0, step = 1, label = 'Counter', bounds } = config
  return {
    value: clampValue(initialValue, bounds),
    step,
    label,
    bounds,
  }
}

export const createCounterStore = (config: CounterConfig = {}) => {
  let state = createInitialState(config)

  const getState = (): CounterState => ({ ...state })

  const transition = (action: CounterAction, ...stepOverride: number[]): CounterState => {
    const [step = state.step] = stepOverride

    const nextValue =
      action === 'reset'
        ? 0
        : action === 'increment'
          ? state.value + step
          : state.value - step

    state = { ...state, value: clampValue(nextValue, state.bounds) }
    return getState()
  }

  return { getState, transition }
}
