export default class ModuleResolutionError extends Error {
	moduleName: string
	parentModuleName: string
	line: number
	column: number

	constructor(moduleName: string, parentModuleName: string, line: number, column: number) {
		super(`Could not resolve module '${moduleName}' required by '${parentModuleName}' at ${line}:${column}`)
		this.moduleName = moduleName
		this.parentModuleName = parentModuleName
		this.line = line
		this.column = column
	}
}
