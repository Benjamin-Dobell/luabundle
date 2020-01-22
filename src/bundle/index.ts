import {
	existsSync,
	lstatSync,
	readFileSync,
} from 'fs'

import {
	resolve as resolvePath,
} from 'path'

import {
	Module,
	ModuleMap,
} from '../common/module'

import {defaultOptions, Options, RealizedOptions} from './options'

import {
	processModule,
} from './process'
import {generateMetadata} from '../metadata'

function mergeOptions(options: Options): RealizedOptions {
	return {
		...defaultOptions,
		...options,
		identifiers: {
			...defaultOptions.identifiers,
			...options.identifiers,
		}
	} as RealizedOptions
}

function bundleModule(module: Module, options: RealizedOptions) {
	const postprocessedContent = options.postprocess ? options.postprocess(module, options) : module.content
	return `${options.identifiers.register}("${module.name}", function()\n${postprocessedContent}\nend)\n`
}

export function bundleString(lua: string, options: Options = {}): string {
	const realizedOptions = mergeOptions(options)
	const processedModules: ModuleMap = {}

	try {
		processModule({
			name: realizedOptions.rootModuleName,
			content: lua,
		}, realizedOptions, processedModules)
	} catch (e) {
		throw new Error(`Failed to bundle entry-point module. Caused by:\n    ${e.stack.replace(/\n/g, '\n    ')}`)
	}

	if (Object.keys(processedModules).length === 1 && !realizedOptions.force) {
		return lua
	}

	const identifiers = realizedOptions.identifiers
	const runtime = readFileSync(resolvePath(__dirname, './runtime.lua'))

	let bundle = ''

	if (realizedOptions.metadata) {
		bundle += generateMetadata(realizedOptions)
	}

	if (realizedOptions.isolate) {
		bundle += 'local require = nil\n'
	}
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
