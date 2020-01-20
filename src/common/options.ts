import {
	Options as LuaparseOptions
} from 'luaparse'

export type Identifiers = {
	register: string,
	require: string,
	loaded: string,
	modules: string,
}

export type LuaVersion = LuaparseOptions['luaVersion']
