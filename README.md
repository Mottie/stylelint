# stylelint MOD

Stripped down version of Stylelint to reduce the file size of the standalone version.

Steps to reproduce (broadly):

* Forked Stylelint then copied files locally.
* Created a separate folder (lets call this `folder2`) and used `npm install stylelint`.
* Then the forked stylelint v8.0.0 files were completely replaced by the npm installed version because it was easier than manually removing tests & other non-essential files.
* Removed:
  * CLI files (including some `lib/formatters`) - pretty much anything that uses [`chalk`](https://www.npmjs.com/package/chalk) was removed.
  * Docs
  * `testUtils` folder
  * [`autoprefixer`](https://www.npmjs.com/package/autoprefixer) - removed extensive caniuse data; and therefore the following rules have been removed:
    * `at-rule-no-vendor-prefix`
    * `media-feature-name-no-vendor-prefix`
    * `property-no-vendor-prefix`
    * `selector-no-vendor-prefix`
    * `value-no-vendor-prefix`
  * All `func` colors from the `lib/reference/namedColorData.js` file (key and values).
  * Block from `lib/rules/color-named/index.js` that accesses `func` colors in the `namedColorData.js` file.
  * All references to node's `fs` (file system) since the standalone version does not need to load in any files.

* Modify:
  * `lib/reference/namedColorData.js` - moved `hex` array from object directly to be a child of the color name.
  * `lib/rules/color-named/index.js` - removed `hex` to directly access the value array modified in `namedColorData.js`.

* At this point all the files were then copied back into the `node_modules` folder (in `folder2`) - mostly because I wasn't sure how to use browserify otherwise.
* Run `browserify -r stylelint -o stylelint-bundle.js` in `folder2`.
* Copy the `stylelint-bundle.js` code into [Google's Closure Compiler](http://closure-compiler.appspot.com/home) using "Whitespace only" optimization. This may take more than one attempt to compile successfully.
* Download the resulting `default.js` file.
* Celebrate because we reduced the file size from 3.25 MB to 871 kB.

See [Stylus](https://github.com/openstyles/stylus/pull/150) for more details.

NOTE: If you know a better method, or can help get a nice [Stylelint bundle using rollup](https://github.com/Mottie/stylelint-bundler) please contact me! Gmail wowmotty.
