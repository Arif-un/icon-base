import { type Edge, type Node, type SetViewport, type Viewport } from 'reactflow'

interface AppStateType {
  flowState: {
    edges: Edge[]
    nodes: Node[]
    setViewport: SetViewport
    viewport: Viewport
  }
}

declare global {
  interface Window {
    appState: AppStateType
  }
}

export {}
