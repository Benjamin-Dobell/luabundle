export type Module = {
	name: string,
	resolvedPath?: string,
	content: string,
}

export type ModuleMap = {
	[name: string]: Module,
}
