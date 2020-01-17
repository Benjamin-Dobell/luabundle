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
import {RealizedOptions} from './options'

export type Module = {
	name: string,
	resolvedPath?: string,
	content: string,
}

export type ModuleMap = {
	[name: string]: Module,
}

type RequireExpression = CallExpression | StringCallExpression

type ResolvedModule = {
	name: string,
	resolvedPath: string,
}

const traverseRequires = (node: Node, callback: (expression: RequireExpression) => void) => {
	const anyNode = node as any
	const children = anyNode.body
		|| anyNode.clauses
		|| anyNode.init
		|| (anyNode.expression ? [anyNode.expression] : [])

	for (let i = children.length - 1; i >= 0; i--) {
		traverseRequires(children[i], callback)
	}

	if (node.type === 'CallExpression' || node.type === 'StringCallExpression') {
		const callExpression = node as RequireExpression
		if (callExpression.base.type === 'Identifier'
			&& callExpression.base.name === 'require'
			&& ((callExpression as StringCallExpression).argument || (callExpression as CallExpression).arguments?.length === 1)) {
			callback(callExpression)
		}
	}
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

	traverseRequires(ast, expression => {
		const argument = (expression as StringCallExpression).argument || (expression as CallExpression).arguments[0]

		let required = null

		if (argument.type == 'StringLiteral') {
			required = argument.value
		} else if (options.expressionHandler) {
			required = options.expressionHandler(name, argument)
		}

		if (required) {
			const requiredModuleNames: string[] = Array.isArray(required) ? required : [required]

			for (const requiredModule of requiredModuleNames) {
				const resolvedPath = resolveModule(requiredModule, options.paths)

				if (!resolvedPath) {
					const start = expression.loc?.start!!
					throw new Error(`Could not resolve module '${requiredModule}' required by '${name}' at ${start.line}:${start.column}`)
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

	processedModules[name] = {
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
