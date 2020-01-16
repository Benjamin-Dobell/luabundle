import {
	existsSync, lstatSync,
	readFileSync,
} from 'fs'

import {
	resolve as resolvePath,
} from 'path'

import {Options, RealizedOptions} from './options'

import {
	ModuleMap,
	NonLiteralRequire,
	processModule,
} from './module'

const defaultOptions: Options = {
	identifiers: {
		register: '__bundle_register',
		require: '__bundle_require',
		loaded: '__bundle_loaded',
		modules: '__bundle_modules',
	},
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

function bundleModule(name: string, content: string, options: RealizedOptions) {
	const postprocessedContent = options.postprocess ? options.postprocess(name, content, options) : content
	return `${options.identifiers.register}("${name}", function(_ENV)\n${postprocessedContent}\nend)\n`
}

export function bundle(inputFilePath: string, options: Options = {}): string {
	if (!existsSync(inputFilePath)) {
		throw new Error(inputFilePath + ' could not be found')
	}

	if (!lstatSync(inputFilePath).isFile()) {
		throw new Error(inputFilePath + ' is not a file')
	}

	const realizedOptions = mergeOptions(options)

	const bundledModules: ModuleMap = {}
	const nonLiteralsRequires: NonLiteralRequire[] = []

	processModule(realizedOptions.rootModuleName, inputFilePath, realizedOptions, bundledModules, nonLiteralsRequires)

	for (const nonLiteralRequire of nonLiteralsRequires) {
		const fileContents = readFileSync(nonLiteralRequire.filePath, 'utf8')
		const start = (nonLiteralRequire.expression as any).range[0]
		const prefix = fileContents.slice(0, start)
		const lineNumber = prefix.match(/\n/g)!.length + 1
		const lineCharacterIndex = prefix.lastIndexOf('\n') + 1
		console.warn(`WARNING: Non-literal found in ${inputFilePath} at ${lineNumber}:${start - lineCharacterIndex + 1}`)
	}

	const identifiers = realizedOptions.identifiers
	const runtime = readFileSync(resolvePath(__dirname, './runtime.lua'))

	let bundleContent = `local ${identifiers.register}, ${identifiers.require}, ${identifiers.modules}, ${identifiers.loaded} = ${runtime}`

	for (const [name, bundledModule] of Object.entries(bundledModules)) {
		bundleContent += bundleModule(name, bundledModule.content!, realizedOptions)
	}

	bundleContent += 'return ' + identifiers.require + '("' + options.rootModuleName + '")'

	return bundleContent
}
