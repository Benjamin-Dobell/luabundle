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

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| **identifiers** | `Identifiers` | See [Identifiers](#identifiers) | """ |
| **paths** | `string[]` | `['?', '?.lua']` | See [Search Paths](#search-paths) |
| **preprocess** | `(name: string, contents: string, options: RealizedOptions) => string` | `undefined` | Preprocess a module, before luabundle makes any of its own modifications.  |
| **postprocess** | `(name: string, contents: string, options: RealizedOptions) => string` | `undefined` | Postprocess a module, immediately before its added to the bundle.  |
| **rootModuleName** | `string` | `"__root"` | The contents of `inputFilePath` are interpreted as module with this name.  |

_**NOTE:** `RealizedOptions` refers to `Options` after all default values have been merged i.e. `identifiers` is guaranteed to exist etc._

### Search Paths

In order to know where to look for required files, Lua [search path patterns](https://www.lua.org/pil/8.1.html) are utilised.

In addition to allowing you to add directories to search within, the pattern format allows you to configure supported file extensions as well.

Files will be resolved relative these paths. If a specified path is itself relative, that path will be resolved relative to the current working directory.

The default behaviour (`paths` option omitted) is to resolve module names relative to the current working directory, considering files with a `.lua` extension or no extension at all.

### Identifiers

_This is an advanced feature. Under normal use you shouldn't need to worry about any of this._

Generated bundles contain a few `local` scoped identifiers which are accessible as upvalues throughout the entire bundle (i.e. in every module).

Most importantly, `require` calls in all bundled modules have been replaced with calls to our bundle's require implementation, by default it's called `__bundle_require`.

If at runtime you want to get a list of all modules included in the bundle, you can iterate through the keys in "modules table", by default accessible as `__bundle_modules`.

| Identifier | Type | Default |
|---|---|---|
| **register** | `string, ` | `"__bundle_register"` |
| **require** | `string` | `"__bundle_require"` |
| **modules** | `string` | `"__bundle_modules"` |
| **loaded** | `string` | `"__bundle_loaded"` |
