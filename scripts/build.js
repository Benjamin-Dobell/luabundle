const {spawn} = require('child_process')
const process = require('process')

const fs = require('fs-extra')
const rimraf = require('rimraf')

const copy = require('./utils/copy')
const {dist, root} = require('./utils/paths')

rimraf.sync(dist('*'), {glob: {dot: true}})

process.chdir(root())

const tsc = root('node_modules', '.bin', 'tsc')
spawn(tsc, ['-b'], { stdio: 'inherit' }).on('exit', code => {
	if (code !== 0) {
		process.exit(code)
	}

	fs.copySync(dist('src/'), dist())
	rimraf.sync(dist('src'))

	copy([
		['src/bundle/runtime.lua', 'bundle/runtime.lua'],
		'.npmignore',
		'package.json',
		'LICENSE',
		'src',
		'scripts'
	])
})
