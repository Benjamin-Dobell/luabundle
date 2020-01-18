const path = require('path')
const process = require('process')

if (path.basename(process.cwd()) !== 'dist') {
	console.error('ERROR: Packaging must be run from the dist/ directory.')
	process.exit(1)
}

require('./build')
