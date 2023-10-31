import {
	existsSync,
	lstatSync,
	readFileSync,
} from 'fs'

import {
	sep as pathSeparator
} from 'path'

import {
	CallExpression,
	Node,
	parse as parseLua,
	StringCallExpression,
} from 'moonsharp-luaparse'

import {Module, ModuleMap} from './module'

import {reverseTraverseRequires} from '../ast'

import {RealizedOptions} from './options'
import {readMetadata} from '../metadata'

import ModuleBundlingError from '../errors/ModuleBundlingError'
import ModuleResolutionError from '../errors/ModuleResolutionError'

type ResolvedModule = {
	name: string,
	resolvedPath: string,
}

export function resolveModule(name: string, packagePaths: readonly string[]) {
	const platformName = name.replace(/\./g, pathSeparator)

	for (const pattern of packagePaths) {
		const path = pattern.replace(/\?/g, platformName)

		if (existsSync(path) && lstatSync(path).isFile()) {
			return path
		}
	}
	return null
}

export function processModule(module: Module, options: RealizedOptions, processedModules: ModuleMap): void {
	let content = options.preprocess ? options.preprocess(module, options) : module.content

	const resolvedModules: ResolvedModule[] = []

	// Ensure we don't attempt to load modules required in nested bundles
	if (!readMetadata(content)) {
		let ast = parseLua(content, {
			locations: true,
			luaVersion: options.luaVersion,
			ranges: true,
		})

		reverseTraverseRequires(ast, expression => {
			const argument = (expression as StringCallExpression).argument || (expression as CallExpression).arguments[0]

			let required = null

			if (argument.type == 'StringLiteral') {
				required = argument.value
			} else if (options.expressionHandler) {
				required = options.expressionHandler(module, argument)
			}

			if (required) {
				const requiredModuleNames: string[] = Array.isArray(required) ? required : [required]

				for (const requiredModule of requiredModuleNames) {
					const resolvedPath = options.resolveModule
						? options.resolveModule(requiredModule, options.paths)
						: resolveModule(requiredModule, options.paths)

					if (!resolvedPath) {
						if (!options.ignoredModuleNames.includes(requiredModule)) {
							const start = expression.loc?.start!!
							throw new ModuleResolutionError(requiredModule, module.name, start.line, start.column)
                        } else {
                            continue
                        }
					}

					resolvedModules.push({
						name: requiredModule,
						resolvedPath,
					})
				}

				if (typeof required === "string") {
					const range = expression.range!
					const baseRange = expression.base.range!
					content = content.slice(0, baseRange[1]) + '("' + required + '")' + content.slice(range[1])
				}
			}
		})
	}

	processedModules[module.name] = {
		...module,
		content,
	}

	for (const resolvedModule of resolvedModules) {
		if (processedModules[resolvedModule.name]) {
			continue
		}

		try {
			const moduleContent = readFileSync(resolvedModule.resolvedPath, options.sourceEncoding)
			processModule({
				...resolvedModule,
				content: moduleContent
			}, options, processedModules)
		} catch (e) {
			throw new ModuleBundlingError(resolvedModule.name, e as Error)
		}
	}
}
