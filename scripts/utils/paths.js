const path = require('path')

const grandParentDir = path.dirname(path.resolve(__dirname, '..'))
const rootDir = path.basename(grandParentDir) === 'dist' ? path.resolve(grandParentDir, '..') : grandParentDir

module.exports = {
	root: (...p) => path.resolve(rootDir, ...p),
	dist: (...p) => path.resolve(rootDir, 'dist', ...p)
}
