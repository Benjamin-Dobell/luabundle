import {readFileSync} from 'fs'

import {
	resolve as resolvePath,
} from 'path'

import {
	Module,
	ModuleMap,
} from './module'

import {defaultOptions, Options, RealizedOptions} from './options'

import {processModule} from './process'
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
	const identifiers = options.identifiers
	return `${identifiers.register}("${module.name}", function(require, _LOADED, ${identifiers.register}, ${identifiers.modules})\n${postprocessedContent}\nend)\n`
}

export function bundleString(lua: string, options: Options = {}): string {
	const realizedOptions = mergeOptions(options)
	const processedModules: ModuleMap = {}

	processModule({
		name: realizedOptions.rootModuleName,
		content: lua,
	}, realizedOptions, processedModules)

	if (Object.keys(processedModules).length === 1 && !realizedOptions.force) {
		return lua
	}

	const identifiers = realizedOptions.identifiers
	const runtime = readFileSync(resolvePath(__dirname, './runtime.lua'), 'utf8')

	let bundle = ''

	if (realizedOptions.metadata) {
		bundle += generateMetadata(realizedOptions)
	}

	bundle += `local ${identifiers.require}, ${identifiers.loaded}, ${identifiers.register}, ${identifiers.modules} = ${runtime}`
	bundle += realizedOptions.isolate ? '(nil)\n' : '(require)\n'

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
	const realizedOptions = mergeOptions(options)
	const lua = readFileSync(inputFilePath, realizedOptions.sourceEncoding)
	return bundleString(lua, options)
}
