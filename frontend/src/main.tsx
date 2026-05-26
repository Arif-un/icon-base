import { RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router'

import { createReactShadow } from './bootstrap/createReactShadow'
import globalCss from './resource/styles/global.css?inline'
import { routeTree } from './routeTree.gen'

const hashHistory = createHashHistory()

const router = createRouter({
  routeTree,
  history: hashHistory,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const host = document.querySelector('#wp-starter-kit-root')
if (host) {
  const { replaceCss } = createReactShadow(host, {
    css: globalCss,
    children: <RouterProvider router={router} />,
  })

  if (import.meta.hot) {
    import.meta.hot.accept('./resource/styles/global.css?inline', mod => {
      if (typeof mod?.default === 'string') replaceCss(mod.default)
    })
  }
}
