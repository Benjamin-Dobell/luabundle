import {
	existsSync,
	lstatSync,
	readFileSync,
} from 'fs'

import {ModuleMap} from '../common/module'

import {defaultMetadata, Metadata, parseMetadata, RealizedMetadata} from '../metadata'
import {Options, RealizedOptions} from './options'

import {
	processModules,
} from './process'

export type UnbundledData = {
	metadata: RealizedMetadata,
	modules: ModuleMap,
}

const defaultOptions: RealizedOptions = {
	rootOnly: false,
}

function mergeOptions(options: Options): RealizedOptions {
	return {
		...defaultOptions,
		...options,
	}
}

function mergeMetadata(metadata: Metadata): RealizedMetadata {
	return {
		...defaultMetadata,
		...metadata,
		identifiers: {
			...defaultMetadata.identifiers,
			...metadata.identifiers,
		}
	} as RealizedMetadata
}

function readMetadata(lua: string): Metadata {
	// We'll allow users to inject comments and blank lines above our header, but that's it (no code).
	for (let [start, end] = [0, lua.indexOf('\n')]; end !== -1; start = end + 1, end = lua.indexOf('\n', start)) {
		const line = lua.substring(start, end)

		if (line.length > 0 && !line.startsWith("--")) {
			break
		}

		try {
			const metadata = parseMetadata(line)

			if (metadata) {
				return metadata
			}
		} catch (e) {
			console.error(e.message)
			process.exit(1)
		}
	}

	console.error("No metadata found. Only bundles with metadata may be unbundled")
	process.exit(1)
}

export function unbundleString(lua: string, options: Options = {}): UnbundledData {
	const realizedOptions = mergeOptions(options)
	const metadata = mergeMetadata(readMetadata(lua))

	const modules = processModules(lua, metadata, realizedOptions)

	const rootModule = modules[metadata.rootModuleName]

	if (!rootModule) {
		console.error(`Bundle corrupt. Root module '${metadata.rootModuleName}' not found.`)
		process.exit(1)
	}

	return {
		metadata,
		modules,
	}
}

export function unbundle(inputFilePath: string, options: Options = {}): UnbundledData {
	if (!existsSync(inputFilePath)) {
		throw new Error(inputFilePath + ' could not be found')
	}

	if (!lstatSync(inputFilePath).isFile()) {
		throw new Error(inputFilePath + ' is not a file')
	}

	const lua = readFileSync(inputFilePath, 'utf8')
	return unbundleString(lua, options)
}
