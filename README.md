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
import bundle from 'luabundle'

const bundledLua = bundle('./file.lua')
// `bundledLua` now contains valid Lua which can be written straight to disk, stdout etc. 
```

If you're using TypeScript, TS definitions are available by default.

## bundle(inputFilePath: string, options: Options) => string

Reads a Lua file, all recursively `require()`d modules, and returns the resultant bundle as a string.

## bundleString(lua: string, options: Options) => string

Loads all modules `require()`d in the provided Lua string, and returns the resultant bundle as a string.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| **expressionHandler** |  `ExpressionHandler` | `undefined` | See [Expression Handler](#expression-handler) |
| **force** | `boolean` | `false` | Whether the provided Lua should always be returned as a bundle, even when it required no other modules. |
| **identifiers** | `Identifiers` | See [Identifiers](#identifiers) | """ |
| **isolate** | `boolean` | `false` | By default, the bundle is not isolated i.e. at runtime we'll try fallback to regular `require()` for modules not included in the bundle. |
| **luaVersion** | `"5.1" | "5.2" | "5.3" | "LuaJIT"` | `"5.3"` |
| **paths** | `string[]` | `['?', '?.lua']` | See [Search Paths](#search-paths) |
| **postprocess** | `(name: string, contents: string, options: RealizedOptions) => string` | `undefined` | Postprocess a module, immediately before its added to the bundle.  |
| **preprocess** | `(name: string, contents: string, options: RealizedOptions) => string` | `undefined` | Preprocess a module, before luabundle makes any of its own modifications.  |
| **rootModuleName** | `string` | `"__root"` | The contents of `inputFilePath` are interpreted as module with this name.  |

_**NOTE:** `RealizedOptions` refers to `Options` after all default values have been merged i.e. `identifiers` is guaranteed to exist etc._

### Search Paths

In order to know where to look for required files, Lua [search path patterns](https://www.lua.org/pil/8.1.html) are utilised.

In addition to allowing you to add directories to search within, the pattern format allows you to configure supported file extensions as well.

Files will be resolved relative these paths. If a specified path is itself relative, that path will be resolved relative to the current working directory.

The default behaviour (`paths` option omitted) is to resolve module names relative to the current working directory, considering files with a `.lua` extension or no extension at all.

### Expression Handler

```typescript
type ExpressionHandler = (module: string, expression: Expression) => string | string[] | null | undefined | void
```

_`Expression` is a [luaparse](https://github.com/fstirlitz/luaparse) expression._

By default, luabundle can only resolve string literal requires. When a `require()` call is encountered that's some other expression e.g.

```lua
require(someVariable)
```

then luabundle cannot resolve this unassisted. `require` will simply be replaced with `__bundle_require` (or the value of `options.identifiers.required`), resulting in something like:

```lua
__bundle_require(someVariable)
```

This will work just fine at runtime _if_ `someVariable` refers to a module that's in the bundle. However, luabundle doesn't _know_ which modules it should add to bundle, and by default won't add any (for this `require()` call).

The simplest way to handle this situation is just to log a warning e.g.

```typescript
import bundle from 'luabundle'

const bundledLua = bundle('./file.lua', {
    expressionHandler: (module, expression) => {
        const start = expression.loc.start
        console.warn(`WARNING: Non-literal require found in '${module}' at ${start.line}:${start.column}`)
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

In this case the generated `__bundle_require()` won't be altered, _however_ luabundle will simply resolve `moduleA` and `moduleB`, and ensure they're included in the bundle.

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

Most importantly, `require` calls in all bundled modules have been replaced with calls to our bundle's require implementation, by default it's called `__bundle_require`.

If at runtime you want to get a list of all modules included in the bundle, you can iterate through the keys in "modules table", by default accessible as `__bundle_modules`.

| Identifier | Default |
|---|---|
| **register** | `"__bundle_register"` |
| **require** | `"__bundle_require"` |
| **modules** | `"__bundle_modules"` |
| **loaded** | `"__bundle_loaded"` |
