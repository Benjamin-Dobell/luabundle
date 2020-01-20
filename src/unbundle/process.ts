import {
	FunctionDeclaration,
	parse as parseLua,
} from 'luaparse'

import {Module, ModuleMap} from '../common/module'

import {iterateModuleRegistrations, reverseTraverseRequires} from '../ast'

import {RealizedMetadata} from '../metadata'
import {RealizedOptions} from './options'

function extractFunctionBody(lua: string, declaration: FunctionDeclaration) {
	if (declaration.body.length > 0) {
		const firstStatement = declaration.body[0]
		const lastStatement = declaration.body[declaration.body.length - 1]

		// TODO: Really should submit a PR to @types/luaparse that adds in range.
		const start = ((firstStatement as any).range as [number, number])[0]
		const end = ((lastStatement as any).range as [number, number])[1]

		return lua.substring(start, end)
	}

	return ''
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
		const range: [number, number] = (expression.base as any).range
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
			content: extractFunctionBody(lua, body)
		}

		const processedContent = processModule(module, metadata, options)

		if (processedContent) {
			module.content = processedContent
			processedModules[module.name] = module
		}

		if (options.rootOnly) {
			return true
		}
	})

	return processedModules
}
