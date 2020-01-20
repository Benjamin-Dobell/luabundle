export type RecursivePartial<T extends object> =  {
	[k in keyof T]?: T[k] extends object ? (T[k] extends any[] | Function ? T[k] : RecursivePartial<T[k]>) : T[k]
}

export type RecursiveReadonly<T extends object> =  {
	readonly [k in keyof T]: T[k] extends object ? (T[k] extends any[] | Function ? T[k] : RecursiveReadonly<T[k]>) : T[k]
}

export type RecursiveMutable<T extends object> =  {
	-readonly [k in keyof T]: T[k] extends object ? (T[k] extends any[] | Function ? T[k] : RecursiveMutable<T[k]>) : T[k]
}
