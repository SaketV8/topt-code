import {createRoot} from 'react-dom/client'
import PopupApp from './PopupApp'
import './styles.css'

console.log('[From the popup page context] Hello from the popup page!')

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Popup root element not found')
}

const reactRoot = createRoot(rootElement as HTMLElement)
reactRoot.render(<PopupApp />)
