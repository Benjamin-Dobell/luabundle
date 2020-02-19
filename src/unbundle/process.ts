import {
	FunctionDeclaration,
	parse as parseLua,
} from 'moonsharp-luaparse'

import {Module, ModuleMap} from './module'

import {iterateModuleRegistrations} from '../ast'

import {RealizedMetadata} from '../metadata'
import {RealizedOptions} from './options'

import MalformedBundleError from '../errors/MalformedBundleError'

function extractModule(lua: string, name: string, declaration: FunctionDeclaration): Module {
	if (declaration.parameters.length !== 4) {
		throw new MalformedBundleError('Module function declaration contained unexpected number of parameters.')
	}

	// luaparse does not included comments in the body, even if you enable
	// comment parsing. However, we don't want to remove user's comments,
	// thus...

	const startIndex = declaration.parameters[3].range![1] + ')\n'.length
	const endIndex = declaration.range![1] - '\nend'.length
	const content = lua.substring(startIndex, endIndex)

	return {
		name,
		content,
		start: {
			index: startIndex,
			line: declaration.loc!.start.line + 1,
			column: 0,
		},
		end: {
			index: endIndex,
			line: declaration.loc!.end.line - 1,
			column: content.length - content.lastIndexOf('\n') - 1
		}
	}
}

export function processModules(lua: string, metadata: RealizedMetadata, options: RealizedOptions): ModuleMap {
	const modules: ModuleMap = {}

	const ast = parseLua(lua, {
		locations: true,
		luaVersion: metadata.luaVersion,
		ranges: true,
	})

	iterateModuleRegistrations(ast, metadata.identifiers.register, (name, body) => {
		if (options.rootOnly && name !== metadata.rootModuleName) {
			return
		}

		modules[name] = extractModule(lua, name, body)

		if (options.rootOnly) {
			return true
		}
	})

	return modules
}
