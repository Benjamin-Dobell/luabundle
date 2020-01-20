import {
	existsSync,
	lstatSync,
	readFileSync,
} from 'fs'

import {
	resolve as resolvePath,
} from 'path'

import {Options, RealizedOptions} from './options'

import {
	Module,
	ModuleMap,
	processModule,
} from './module'

const defaultOptions: RealizedOptions = {
	force: false,
	identifiers: {
		register: '__bundle_register',
		require: '__bundle_require',
		loaded: '__bundle_loaded',
		modules: '__bundle_modules',
	},
	isolate: false,
	luaVersion: '5.3',
	paths: ['?', '?.lua'],
	rootModuleName: '__root',
}

function mergeOptions(options: Options): RealizedOptions {
	return {
		...defaultOptions,
		...(options as RealizedOptions),
		identifiers: {
			...defaultOptions.identifiers,
			...(options as RealizedOptions).identifiers,
		}
	}
}

function bundleModule(module: Module, options: RealizedOptions) {
	const postprocessedContent = options.postprocess ? options.postprocess(module, options) : module.content
	return `${options.identifiers.register}("${module.name}", function()\n${postprocessedContent}\nend)\n`
}

export function bundleString(lua: string, options: Options = {}): string {
	const realizedOptions = mergeOptions(options)
	const processedModules: ModuleMap = {}

	processModule({
		name: realizedOptions.rootModuleName,
		content: lua,
	}, realizedOptions, processedModules)

	if (Object.keys(processedModules).length === 1 && !options.force) {
		return lua
	}

	const identifiers = realizedOptions.identifiers
	const runtime = readFileSync(resolvePath(__dirname, './runtime.lua'))

	let bundle = options.isolate ? 'local require = nil\n' : ''
	bundle += `local ${identifiers.register}, ${identifiers.require}, ${identifiers.modules}, ${identifiers.loaded} = ${runtime}`

	for (const [name, processedModule] of Object.entries(processedModules)) {
		bundle += bundleModule({
			name,
			content: processedModule.content!
		}, realizedOptions)
	}

	bundle += 'return ' + identifiers.require + '("' + realizedOptions.rootModuleName + '")'

	return bundle
}

export function bundle(inputFilePath: string, options: Options = {}): string {
	if (!existsSync(inputFilePath)) {
		throw new Error(inputFilePath + ' could not be found')
	}

	if (!lstatSync(inputFilePath).isFile()) {
		throw new Error(inputFilePath + ' is not a file')
	}

	const lua = readFileSync(inputFilePath, 'utf8')
	return bundleString(lua, options)
}
