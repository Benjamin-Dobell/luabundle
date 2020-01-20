import {
	existsSync,
	lstatSync,
	readFileSync,
} from 'fs'

import {
	CallExpression,
	Node,
	parse as parseLua,
	StringCallExpression,
} from 'luaparse'

import {Module, ModuleMap} from '../common/module'

import {reverseTraverseRequires} from '../ast'

import {RealizedOptions} from './options'

type ResolvedModule = {
	name: string,
	resolvedPath: string,
}

export function resolveModule(name: string, packagePaths: readonly string[]) {
	for (const pattern of packagePaths) {
		const path = pattern.replace(/\?/g, name)

		if (existsSync(path) && lstatSync(path).isFile()) {
			return path
		}
	}
	return null
}

export function processModule(module: Module, options: RealizedOptions, processedModules: ModuleMap): void {
	const bundleRequire = options.identifiers.require
	const resolvedModules: ResolvedModule[] = []

	const preprocessedContent = options.preprocess ? options.preprocess(module, options) : module.content
	const ast = parseLua(preprocessedContent, {
		locations: true,
		luaVersion: options.luaVersion,
		ranges: true,
	})

	let processedContent = preprocessedContent

	reverseTraverseRequires(ast, "require", expression => {
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
				const resolvedPath = resolveModule(requiredModule, options.paths)

				if (!resolvedPath) {
					const start = expression.loc?.start!!
					throw new Error(`Could not resolve module '${requiredModule}' required by '${module.name}' at ${start.line}:${start.column}`)
				}

				resolvedModules.push({
					name: requiredModule,
					resolvedPath,
				})
			}

			if (typeof required === "string") {
				const range: [number, number] = (expression as any).range
				processedContent = processedContent.slice(0, range[0]) + bundleRequire + '("' + required + '")' + processedContent.slice(range[1])
			} else {
				required = null
			}
		}

		if (!required) {
			const range: [number, number] = (expression.base as any).range
			processedContent = processedContent.slice(0, range[0]) + bundleRequire + processedContent.slice(range[1])
		}
	})

	processedModules[module.name] = {
		...module,
		content: processedContent,
	}

	for (const module of resolvedModules) {
		if (processedModules[module.name]) {
			continue
		}

		const moduleContent = readFileSync(module.resolvedPath, 'utf8')
		processModule({
			...module,
			content: moduleContent
		}, options, processedModules)
	}
}
