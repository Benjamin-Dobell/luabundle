export default class ModuleBundlingError extends Error {
	moduleName: string
	cause: Error

	constructor(moduleName: string, cause: Error) {
		super(`Failed to bundle resolved module ${moduleName}`)
		this.moduleName = moduleName
		this.cause = cause
	}
}
