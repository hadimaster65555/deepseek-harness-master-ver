/** Mount the local React renderer before Electron reveals the welcome window. */
import '@master-harness/client-ui-theme/src/styles/design-platform.css'
import '@master-harness/client-ui-theme/src/styles/gradient-shadow-text.css'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Welcome } from './WelcomePage.tsx'
import type { WelcomeApi } from '../welcome-api.ts'

declare global {
  interface Window {
    mhWelcome: WelcomeApi
  }
}

const container = document.getElementById('root')
if (container === null) throw new Error('desktop welcome: missing React root')
const root = createRoot(container)
flushSync(() => { root.render(<Welcome api={window.mhWelcome} />) })
window.addEventListener('pagehide', () => { root.unmount() }, { once: true })
