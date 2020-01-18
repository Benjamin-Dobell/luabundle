const path = require('path')

const fs = require('fs-extra')

const {dist, root} = require('./paths')

module.exports = function(content) {
	content.forEach(c => {
		if (typeof c === 'string') {
			fs.copySync(root(c), dist(c))
		} else {
			fs.copySync(root(c[0]), dist(c[1]))
		}
	})
}
