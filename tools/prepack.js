const fs = require('fs')
const path = require('path')

const runtimeSrc = path.resolve(__dirname, '../src/bundle/runtime.lua')
const runtimeDest = path.resolve(__dirname, '../lib/bundle/runtime.lua')

fs.copyFileSync(runtimeSrc, runtimeDest)
