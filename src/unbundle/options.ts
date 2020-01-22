import {RecursiveMutable, RecursivePartial, RecursiveReadonly} from '../common/utility'

export type RealizedOptions = RecursiveReadonly<{
	rootOnly: boolean,
}>

export type Options = RecursiveMutable<RecursivePartial<RealizedOptions>>
