mip-builder
===========

Builder for MIP and MIP Extension

<a href="https://circleci.com/gh/mipengine/mip-builder/tree/master"><img src="https://img.shields.io/circleci/project/mipengine/mip-builder/master.svg?style=flat-square" alt="Build Status"></a>

## Usage

`(new Builder(options)).build()`

```javascript
var Builder = require('mip-builder');

var builder = new Builder({
    dir: '/your/build/root',
    outputDir: '/your/output/target/directory',

    files: [
        // bla bla
    ],

    processor: [
        // bla bla
    ]
});

builder.build();
```

## API



### options

#### dir

`string`

The directory which you want to build.

#### outputDir

`string`

Output target directory for build result.

#### files

`Array.<string>`

Selectors for select which file should be do building.

#### processors

`Array.<Processor|Object>`

Processors, each one will apply to all files by default.



### methods

#### prepare

'arguments': none

`return`: Promise

`description`: load all files


#### process

'arguments': none

`return`: Promise

`description`: do process for all files. this method must call after prepare resolved.


#### output

'arguments': none

`return`: Promise

`description`: generate all files to outputDir.
