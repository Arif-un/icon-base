 
import RefreshRuntime from '/@react-refresh'

RefreshRuntime.injectIntoGlobalHook(window)
 
window.$RefreshReg$ = () => {}
// eslint-disable-next-line unicorn/consistent-function-scoping
window.$RefreshSig$ = () => type => type
window.__vite_plugin_react_preamble_installed__ = true
