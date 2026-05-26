import { createRoot } from 'react-dom/client'

import Welcome from './Welcome'
import './resource/styles/global.css'

const elm = document.querySelector('#wp-starter-kit-root')
if (elm) {
  createRoot(elm).render(<Welcome />)
}
