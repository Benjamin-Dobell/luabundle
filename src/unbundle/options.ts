import {Module} from '../common/module'
import {RecursiveMutable, RecursivePartial, RecursiveReadonly} from '../common/utility'

import {RealizedMetadata} from '../metadata'

export type Process = (module: Module, metadata: RealizedMetadata, options: RealizedOptions) => string | false | null | undefined | void

export type RealizedOptions = RecursiveReadonly<{
	postprocess?: Process,
	preprocess?: Process,
	rootOnly: boolean,
}>

export type Options = RecursiveMutable<RecursivePartial<RealizedOptions>>
