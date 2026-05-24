#!/usr/bin/env node

import proPackageJson from 'pro-module/package.json' with { type: 'json' }
import fs from 'node:fs'
import freePackageJson from '../package.json' with { type: 'json' }
import _ from 'lodash'

console.log('🚀🚀🚀 Adding free deps to pro...')
const freeDeps = freePackageJson.dependencies
const proPeerDeps = proPackageJson.peerDependencies

const proDeps = _.difference(Object.keys(proPackageJson.dependencies), Object.keys(freeDeps))
  .map(key => ({ [key]: proPackageJson.dependencies[key] }))
  .reduce((accumulator, current) => ({ ...accumulator, ...current }), {})

proPackageJson.dependencies = { ...proDeps }
proPackageJson.peerDependencies = { ...proPeerDeps, ...freeDeps }

if ('pro-module' in proPackageJson.peerDependencies) {
  delete proPackageJson.peerDependencies['pro-module']
}
// write pro package.json
fs.writeFileSync('pro/frontend-pro/pro-module/package.json', JSON.stringify(proPackageJson, null, 2))

