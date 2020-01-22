import {
	existsSync,
	lstatSync,
	readFileSync,
} from 'fs'

import {ModuleMap} from './module'

import {defaultMetadata, Metadata, readMetadata, RealizedMetadata} from '../metadata'
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

export function unbundleString(lua: string, options: Options = {}): UnbundledData {
	const metadata = readMetadata(lua)

	if (!metadata) {
		throw new Error('No metadata found. Only bundles with metadata may be unbundled')
	}

	const realizedOptions = mergeOptions(options)
	const realizedMetadata = mergeMetadata(metadata)

	const modules = processModules(lua, realizedMetadata, realizedOptions)
	const rootModule = modules[realizedMetadata.rootModuleName]

	if (!rootModule) {
		throw new Error(`Malformed bundle. Root module '${realizedMetadata.rootModuleName}' not found.`)
	}

	return {
		metadata: realizedMetadata,
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
