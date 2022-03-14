luabundle
==========

A library for bundling several Lua files into a single file.

If you're after a CLI tool, please see [luabundler](https://github.com/Benjamin-Dobell/luabundler), which utilises this library.

[![Version](https://img.shields.io/npm/v/luabundle.svg)](https://npmjs.org/package/luabundle)
[![Downloads/week](https://img.shields.io/npm/dw/luabundle.svg)](https://npmjs.org/package/luabundle)
[![License](https://img.shields.io/npm/l/luabundle.svg)](https://github.com/Benjamin-Dobell/luabundle/blob/master/package.json)

* [Installation](#installation)
* [Usage](#usage)

# Installation

Install the node module with:

```bash
yarn add luabundle
```

or with NPM:

```bash
npm install --save luabundle
```

# Usage

```js
import { bundle } from 'luabundle'

const bundledLua = bundle('./file.lua')
// `bundledLua` now contains valid Lua which can be written straight to disk, stdout etc.
```

If you're using TypeScript, TS definitions are available by default.

# Bundling

In order to create a bundle, any referenced files will be loaded from disk. However, the root module (entry-point Lua) may be provided either as a file path (`bundle`), or as a string (`bundleString`).

## bundle(inputFilePath: string, options: BundleOptions) => string

Reads a Lua file, all recursively `require()`d modules, and returns the resultant bundle as a string.

## bundleString(lua: string, options: BundleOptions) => string

Loads all modules `require()`d in the provided Lua string, and returns the resultant bundle as a string.

## Bundle Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| **expressionHandler** |  `ExpressionHandler` | `undefined` | See [Expression Handler](#expression-handler) |
| **force** | `boolean` | `false` | Whether the provided Lua should always be returned as a bundle, even when it required no other modules. |
| **identifiers** | `Identifiers` | See [Identifiers](#identifiers) | """ |
| **isolate** | `boolean` | `false` | By default, the bundle is not isolated i.e. at runtime we'll try fallback to regular `require()` for modules not included in the bundle. |
| **luaVersion** | `"5.1" \| "5.2" \| "5.3" \| "LuaJIT"` | `"5.3"` |
| **metadata** | `boolean` | `true` | Unless set to `false`, the bundle will be encoded with metadata (Lua comments) that describe the specification of the bundle. Unbundling is only possible for bundles that are bundled with metadata. |
| **paths** | `string[]` | `['?', '?.lua']` | See [Search Paths](#search-paths) |
| **postprocess** | `(module: Module, options: RealizedOptions) => string` | `undefined` | Postprocess a module, immediately before its added to the bundle.  |
| **preprocess** | `(module: Module, options: RealizedOptions) => string` | `undefined` | Preprocess a module, before luabundle makes any of its own modifications.  |
| **rootModuleName** | `string` | `"__root"` | The contents of `inputFilePath` are interpreted as module with this name.  |
| **ignoredModules** | `(string | RegExp)[]` | `[]` |  A list of module names that will be ignored during bundling. Regular expressions may be used to pattern match against the module name  |

`RealizedOptions` refers to these `Options` after all default values have been merged i.e. `identifiers` is guaranteed to exist etc.

`Module` refers to an object of the form:

```typescript
type Module = {
	name: string,
	resolvedPath?: string,
	content: string,
}
```

### Search Paths

In order to know where to look for required files, Lua [search path patterns](https://www.lua.org/pil/8.1.html) are utilised.

In addition to allowing you to add directories to search within, the pattern format allows you to configure supported file extensions as well.

Files will be resolved relative these paths. If a specified path is itself relative, that path will be resolved relative to the current working directory.

The default behaviour (`paths` option omitted) is to resolve module names relative to the current working directory, considering files with a `.lua` extension or no extension at all.

### Expression Handler

```typescript
type ExpressionHandler = (module: Module, expression: Expression) => string | string[] | null | undefined | void
```

`Expression` is a [moonsharp-luaparse](https://github.com/Benjamin-Dobell/moonsharp-luaparse) expression.

`Module` is as described [above](#bundle-options).

By default, luabundle can only resolve string literal requires. When a `require()` call is encountered that's some other expression e.g.

```lua
require(someVariable)
```

then luabundle cannot determine which modules may be dynamically required, thus the `require` call is simply ignored.

This will work just fine at runtime _if_ `someVariable` refers to a module that's in the bundle. However, luabundle doesn't _know_ which modules it should add to bundle, and by default won't add any (for this `require()` call).

The simplest way to handle this situation is just to log a warning e.g.

```typescript
import bundle from 'luabundle'

const bundledLua = bundle('./file.lua', {
	expressionHandler: (module, expression) => {
		const start = expression.loc.start
		console.warn(`WARNING: Non-literal require found in '${module.name}' at ${start.line}:${start.column}`)
	},
})
```

However, if you know at bundle time a list of modules that you want to include for dynamic requires you can do something like:

```typescript
import bundle from 'luabundle'

const bundledLua = bundle('./file.lua', {
    expressionHandler: () => ['moduleA', 'moduleB'],
})
```

In this case the generated `require()` call won't be altered in any way, _however_ luabundle will simply resolve `moduleA` and `moduleB` and add them to the bundle.

Alternatively, if a module name is returned as a `string` (_not_ a `string[]`), luabundle will substitute out the dynamic expression for a string literal, resolve the module, and ensure it's included in the bundle.

### Identifiers

_This is an advanced feature. Under normal use you shouldn't need to worry about any of this._

```typescript
type Identifiers = {
	register: string,
	require: string,
	loaded: string,
	modules: string,
}
```

Generated bundles contain a few `local` scoped identifiers which are accessible as upvalues throughout the entire bundle (i.e. in every module).

| Identifier | Default |
|---|---|
| **register** | `"__bundle_register"` |
| **require** | `"__bundle_require"` |
| **modules** | `"__bundle_modules"` |
| **loaded** | `"__bundle_loaded"` |

If for example, at runtime you want to get a list of all modules included in the bundle, you can iterate through the keys in "modules table", by default accessible as `__bundle_modules`.

# Unbundling

If a bundle was generated with metadata (default), then luabundle is also able to unbundle it. If an attempt is made to unbundle a file that does not contain bundle metadata, an error will be thrown.

Because Lua (and luabundle) utilise [Search Paths](#search-paths) when creating the bundle, modules could have come from many different locations. This information is intentionally _not_ encoded in the bundle, thus whilst we'll output a valid module directory structure, it may not match the original.

## unbundle(inputFilePath: string, options: Options) => UnbundledData

Reads a bundle file, and returns all modules contained within, unless the `rootOnly` is `true`, in which case other modules will be ignored.

## unbundleString(lua: string, options: Options) => UnbundledData

Returns all modules contained within the specified Lua string, unless the `rootOnly` is `true`, in which case other modules will be ignored.

## Unbundled Data

```typescript
type UnbundledData = {
	metadata: Metadata,
	modules: ModuleMap,
}

type ModuleMap = {
	[name: string]: Module,
}

type Module = {
	name: string,
	content: string,
	start: FilePosition,
	end: FilePosition,
}

type FilePosition = {
	index: number,
	line: number,
	column: number,
}
```

In addition to `name` and `content`. each module also has a `start` and `end`, which describe where the module is located within the provided bundle.

`Metadata` is described [below](#metadata).

## Unbundle Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| **rootOnly** | `boolean` | `false` | When set to `true`, only the root module of the bundle will be processed and returned. |

`RealizedOptions` refers to these `Options` after all default values have been merged i.e. `identifiers` is guaranteed to exist etc.

`Module` is the same type encountered when [bundling](#bundle-options).

### Metadata

Unless disabled when bundling, bundles are generated with some metadata that is necessary to unbundle.

With the exception of `version`, these values/types correspond with the types described [above](#bundle-options). `version` is simply the version of luabundle that generated the bundle.

```typescript
type Metadata = {
	identifiers: Identifiers,
	luaVersion: string,
	rootModuleName: string,
	version: string,
}
```
