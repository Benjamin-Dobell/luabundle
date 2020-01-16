type RecursivePartial<T> = T extends Function ? T : Partial<{
	[k in keyof T]: T[k] extends Function ? T[k] : RecursivePartial<T[k]>
}>

type RecursiveReadonly<T> = T extends Function ? T : {
	readonly [k in keyof T]: RecursiveReadonly<T[k]>
}

type RecursiveMutable<T> = T extends Function ? T : {
	-readonly [k in keyof T]: RecursiveReadonly<T[k]>
}

type Identifiers = {
	register: string,
	require: string,
	loaded: string,
	modules: string,
}

export type Process = (name: string, contents: string, options: RealizedOptions) => string

export type RealizedOptions = RecursiveReadonly<{
	identifiers: Identifiers,
	paths: string[],
	preprocess?: Process,
	postprocess?: Process,
	rootModuleName: string,
}>

export type Options = RecursiveMutable<RecursivePartial<RealizedOptions>>
