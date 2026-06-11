import './style.css'
import { mountCounterApp } from './dom/counterView'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Unable to find #app root element')
}

mountCounterApp(app)
