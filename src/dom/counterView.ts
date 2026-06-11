import type { CounterAction, CounterState } from '../types/counter'
import { createCounterStore } from '../utils/counterStore'

const actionLabels: Record<CounterAction, string> = {
  increment: 'Increment',
  decrement: 'Decrement',
  reset: 'Reset',
}

const isCounterAction = (value: string): value is CounterAction =>
  Object.keys(actionLabels).includes(value)

const describeState = (state: CounterState): string => {
  const summary = Object.entries({
    value: state.value,
    step: state.step,
    min: state.bounds?.min ?? 'none',
    max: state.bounds?.max ?? 'none',
  })
    .map(([key, value]) => `${key}: ${value}`)
    .join(' • ')

  return `${state.label} (${summary})`
}

export const mountCounterApp = (root: HTMLElement): void => {
  root.innerHTML = `
    <main class="counter-app">
      <h1>Interactive TypeScript Counter</h1>
      <p id="counter-description"></p>
      <p id="counter-value" class="counter-value"></p>
      <div class="controls">
        ${Object.entries(actionLabels)
          .map(
            ([action, label]) =>
              `<button type="button" data-action="${action}" class="counter-button">${label}</button>`,
          )
          .join('')}
      </div>
    </main>
  `

  const description = root.querySelector<HTMLParagraphElement>('#counter-description')
  const value = root.querySelector<HTMLParagraphElement>('#counter-value')
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-action]')

  if (!description || !value || buttons.length === 0) {
    throw new Error('Counter UI did not render correctly.')
  }

  const store = createCounterStore({
    label: 'Counter',
    step: 1,
    initialValue: 0,
    bounds: { min: -10, max: 10 },
  })

  const render = (state: CounterState): void => {
    value.textContent = `${state.value}`
    description.textContent = describeState(state)
  }

  render(store.getState())

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action ?? ''

      if (!isCounterAction(action)) {
        return
      }

      render(store.transition(action))
    })
  })
}
