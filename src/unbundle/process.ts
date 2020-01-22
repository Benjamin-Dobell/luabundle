import {
	FunctionDeclaration,
	parse as parseLua,
} from 'moonsharp-luaparse'

import {Module, ModuleMap} from '../common/module'

import {iterateModuleRegistrations, reverseTraverseRequires} from '../ast'

import {RealizedMetadata} from '../metadata'
import {RealizedOptions} from './options'

function extractModuleBody(lua: string, declaration: FunctionDeclaration) {
	if (declaration.parameters.length > 0) {
		throw new Error('Malformed bundle. Module function declaration unexpectedly contained parameters.')
	}

	// luaparse does not included comments in the body, even if you enable
	// comment parsing. However, we don't want to remove user's comments,
	// thus...

	const start = declaration.range![0] + 'function()\n'.length
	const end = declaration.range![1] - '\nend'.length

	return lua.substring(start, end)
}

function processModule(module: Module, metadata: RealizedMetadata, options: RealizedOptions): string | null {
	if (options.preprocess) {
		const preprocessResult = options.preprocess(module, metadata, options)

		if (preprocessResult) {
			module.content = preprocessResult
		} else if (preprocessResult === false) {
			return null
		}
	}

	const ast = parseLua(module.content, {
		locations: true,
		luaVersion: metadata.luaVersion,
		ranges: true,
	})

	reverseTraverseRequires(ast, metadata.identifiers.require, expression => {
		const range = expression.base.range!
		module.content = module.content.slice(0, range[0]) + 'require' + module.content.slice(range[1])
	})

	if (options.postprocess) {
		const postprocessResult = options.postprocess(module, metadata, options)

		if (postprocessResult) {
			module.content = postprocessResult
		} else if (postprocessResult === false) {
			return null
		}
	}

	return module.content
}

export function processModules(lua: string, metadata: RealizedMetadata, options: RealizedOptions): ModuleMap {
	const processedModules: ModuleMap = {}

	const ast = parseLua(lua, {
		locations: true,
		luaVersion: metadata.luaVersion,
		ranges: true,
	})

	iterateModuleRegistrations(ast, metadata.identifiers.register, (name, body) => {
		if (options.rootOnly && name !== metadata.rootModuleName) {
			return
		}

		const module: Module = {
			name,
			content: extractModuleBody(lua, body)
		}

		try {
			const processedContent = processModule(module, metadata, options)

			if (processedContent) {
				module.content = processedContent
				processedModules[module.name] = module
			}
		} catch (e) {
			throw new Error(`Failed to unbundle module '${module.name}'. Caused by:\n    ${e.stack.replace(/\n/g, '\n    ')}`)
		}

		if (options.rootOnly) {
			return true
		}
	})

	return processedModules
}
