export type FilePosition = {
	index: number,
	line: number,
	column: number,
}

export type Module = {
	name: string,
	content: string,
	start: FilePosition,
	end: FilePosition,
}

export type ModuleMap = {
	[name: string]: Module,
}
