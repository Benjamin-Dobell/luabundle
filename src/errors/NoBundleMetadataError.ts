export default class NoBundleMetadataError extends Error {
	constructor() {
		super("No metadata found. Only bundles with metadata may be unbundled")
	}
}
