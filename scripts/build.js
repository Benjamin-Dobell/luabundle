const {spawn} = require('child_process')
const path = require('path')
const process = require('process')

const fs = require('fs-extra')
const klawSync = require('klaw-sync')
const rimraf = require('rimraf')

const copy = require('./utils/copy')
const {dist, root} = require('./utils/paths')

rimraf.sync(dist('*'), {glob: {dot: true}})

if (fs.existsSync(root('gen'))) {
	rimraf.sync(root('gen/*'), {glob: {dot: true}})
} else {
	fs.mkdirSync(root('gen'))
}

fs.copySync(root('package.json'), root('gen/package.json'))

process.chdir(root())

const sourceRegex = new RegExp(`(sources":\\[")(?:\\.\\.${path.sep}\\.\\.${path.sep})((?:\\.\\.\\${path.sep})*src)`)

// Surely there's some way to make tsconfig play nice. Ah well...
function relocateJs() {
	for (const item of klawSync(dist('src'), {filter: item => item.path.endsWith(".map"), traverseAll: true})) {
		const content = fs.readFileSync(item.path, "utf8")
		fs.writeFileSync(item.path, content.replace(sourceRegex, (_, prefix, suffix) => prefix + suffix))
	}

	fs.copySync(dist('src/'), dist())
	rimraf.sync(dist('src'))
}

const tsc = root('node_modules', '.bin', 'tsc')
spawn(tsc, ['-b'], { stdio: 'inherit' }).on('exit', code => {
	if (code !== 0) {
		process.exit(code)
	}

	rimraf.sync(dist('gen'))

	relocateJs()

	copy([
		['src/bundle/runtime.lua', 'bundle/runtime.lua'],
		'.npmignore',
		'package.json',
		'LICENSE',
		'src',
		'scripts'
	])
})
