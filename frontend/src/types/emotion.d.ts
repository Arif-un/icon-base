import { type Theme as AntTheme } from '@ant-design/cssinjs'
import '@emotion/react'
import { type GlobalToken } from 'antd'
import { type MapToken } from 'antd/es/theme/interface/maps'
import { type SeedToken } from 'antd/es/theme/interface/seeds'

declare module '@emotion/react' {
  export interface Theme {
    hashId: string
    theme: AntTheme<SeedToken, MapToken>
    token: GlobalToken
  }
}
