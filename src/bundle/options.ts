import {
	Expression,
	Options as LuaparseOptions,
} from 'luaparse'

import {Module} from './module'

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

export type ExpressionHandler = (module: Module, expression: Expression) => string | string[] | null | undefined | void
export type Process = (module: Module, options: RealizedOptions) => string

export type RealizedOptions = RecursiveReadonly<{
	expressionHandler?: ExpressionHandler,
	force: boolean,
	identifiers: Identifiers,
	isolate: boolean,
	luaVersion: LuaparseOptions['luaVersion'],
	paths: string[],
	postprocess?: Process,
	preprocess?: Process,
	rootModuleName: string,
}>

export type Options = RecursiveMutable<RecursivePartial<RealizedOptions>>
