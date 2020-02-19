import {version} from '../package.json'

import {defaultOptions as defaultBundleOptions, RealizedOptions as BundleOptions} from '../bundle/options'

import {RecursivePartial} from '../common/utility'

import MalformedBundleError from '../errors/MalformedBundleError'

export type RealizedMetadata = Pick<BundleOptions, 'identifiers' | 'luaVersion' | 'rootModuleName'> & {
	version: string
}

export type Metadata = RecursivePartial<RealizedMetadata>

export const defaultMetadata: RealizedMetadata = {
	identifiers: defaultBundleOptions.identifiers,
	luaVersion: defaultBundleOptions.luaVersion,
	rootModuleName: defaultBundleOptions.rootModuleName,
	version
}

function intersectionDiff<Set extends object>(a: Set, subset: RecursivePartial<Set>): RecursivePartial<Set> & RecursivePartial<typeof subset> {
	type Subset = typeof subset
	type Diff = RecursivePartial<typeof subset> & RecursivePartial<Set>
	const diff: Diff = {}

	for (const key of Object.keys(subset)) {
		const setValue = a[key as keyof Set]
		const subsetValue = subset[key as keyof Subset]

		if (setValue !== undefined && subsetValue !== undefined && setValue !== subsetValue) {
			if (setValue
				&& typeof setValue === 'object'
				&& !(setValue instanceof Array)
				&& subsetValue
				&& typeof subsetValue === 'object'
				&& !(subsetValue instanceof Array)) {
				const recursiveDiff = intersectionDiff(
					setValue as (typeof setValue & object),
					subsetValue as (typeof setValue & object)
				)

				if (Object.entries(recursiveDiff).length > 0) {
					diff[key as keyof Diff] = recursiveDiff as any
				}
			} else {
				diff[key as keyof Diff] = subsetValue as any
			}
		}
	}

	return diff
}

export function generateMetadata(options: BundleOptions): string {
	const metadata: Metadata = intersectionDiff(defaultMetadata, options)
	metadata.version = version
	return `-- Bundled by luabundle ${JSON.stringify(metadata)}\n`
}

function parseMetadata(line: string): Metadata | null {
	const match = line.match(/^-- Bundled by luabundle ({.+})$/)

	if (match) {
		const metadata = JSON.parse(match[1])

		if (!metadata['version']) {
			throw new MalformedBundleError('Bundle contains invalid metadata')
		}

		return metadata as Metadata
	}

	return null
}

export function readMetadata(lua: string): Metadata | null {
	// We'll allow users to inject comments and blank lines above our header, but that's it (no code).
	for (let [start, end] = [0, lua.indexOf('\n')]; end !== -1; start = end + 1, end = lua.indexOf('\n', start)) {
		const line = lua.substring(start, end)

		if (line.length > 0 && !line.startsWith("--")) {
			break
		}

		const metadata = parseMetadata(line)

		if (metadata) {
			return metadata
		}
	}

	return null
}
