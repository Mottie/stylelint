/* @flow */
"use strict";
const createStylelint = require("./createStylelint");
const debug = require("debug")("stylelint:standalone");
const FileCache = require("./utils/FileCache");
const formatters /*: Object*/ = require("./formatters");
// const fs = require("fs");
const globby /*: Function*/ = require("globby");
const hash = require("./utils/hash");
const ignore = require("ignore");
const needlessDisables /*: Function*/ = require("./needlessDisables");
// const path = require("path");
const pify = require("pify");
const pkg = require("../package.json");

const DEFAULT_IGNORE_FILENAME = ".stylelintignore";
const FILE_NOT_FOUND_ERROR_CODE = "ENOENT";
const ALWAYS_IGNORED_GLOBS = ["**/node_modules/**", "**/bower_components/**"];

/*::type CssSyntaxErrorT = {
  column: number;
  file?: string;
  input: {
    column: number;
    file?: string;
    line: number;
    source: string;
  };
  line: number;
  message: string;
  name: string;
  reason: string;
  source: string;
}*/

module.exports = function(
  options /*: stylelint$standaloneOptions */
) /*: Promise<stylelint$standaloneReturnValue>*/ {
  const cacheLocation = options.cacheLocation;
  const code = options.code;
  const codeFilename = options.codeFilename;
  const config = options.config;
  const configBasedir = options.configBasedir;
  const configFile = options.configFile;
  const configOverrides = options.configOverrides;
  const customSyntax = options.customSyntax;
  const files = options.files;
  const fix = options.fix;
  const formatter = options.formatter;
  const ignoreDisables = options.ignoreDisables;
  const reportNeedlessDisables = options.reportNeedlessDisables;
  const syntax = options.syntax;
  const useCache = options.cache || false;
  let fileCache;
  const startTime = Date.now();

  // The ignorer will be used to filter file paths after the glob is checked,
  // before any files are actually read
  const ignoreFilePath = options.ignorePath || DEFAULT_IGNORE_FILENAME;
  const absoluteIgnoreFilePath = ignoreFilePath; 
  // path.isAbsolute(ignoreFilePath)
  //   ? ignoreFilePath
  //   : path.resolve(process.cwd(), ignoreFilePath);
  let ignoreText = "";
  /*
  try {
    ignoreText = fs.readFileSync(absoluteIgnoreFilePath, "utf8");
  } catch (readError) {
    if (readError.code !== FILE_NOT_FOUND_ERROR_CODE) throw readError;
  }
  */
  const ignorer = ignore().add(ignoreText);

  const isValidCode = typeof code === "string";
  if ((!files && !isValidCode) || (files && (code || isValidCode))) {
    throw new Error(
      "You must pass stylelint a `files` glob or a `code` string, though not both"
    );
  }

  let formatterFunction;
  if (typeof formatter === "string") {
    formatterFunction = formatters[formatter];
    if (formatterFunction === undefined) {
      return Promise.reject(
        new Error(
          "You must use a valid formatter option: 'json', 'string', 'verbose', or a function"
        )
      );
    }
  } else if (typeof formatter === "function") {
    formatterFunction = formatter;
  } else {
    formatterFunction = formatters.json;
  }

  const stylelint = createStylelint({
    config,
    configFile,
    configBasedir,
    configOverrides,
    ignoreDisables,
    reportNeedlessDisables,
    syntax,
    customSyntax,
    fix
  });

  if (!files) {
    const absoluteCodeFilename = codeFilename;
    return stylelint
      ._lintSource({
        code,
        codeFilename: absoluteCodeFilename
      })
      .then(postcssResult => {
        return stylelint._createStylelintResult(postcssResult);
      })
      .catch(handleError)
      .then(stylelintResult => {
        return prepareReturnValue([stylelintResult]);
      });
  }

  let fileList = files;
  if (typeof fileList === "string") {
    fileList = [fileList];
  }
  if (!options.disableDefaultIgnores) {
    fileList = fileList.concat(ALWAYS_IGNORED_GLOBS.map(glob => "!" + glob));
  }

  return "";

  function prepareReturnValue(
    stylelintResults /*: Array<stylelint$result>*/
  ) /*: stylelint$standaloneReturnValue*/ {
    const errored = stylelintResults.some(
      result => result.errored || result.parseErrors.length > 0
    );
    const returnValue /*: stylelint$standaloneReturnValue*/ = {
      errored,
      output: formatterFunction(stylelintResults),
      results: stylelintResults
    };
    if (reportNeedlessDisables) {
      returnValue.needlessDisables = needlessDisables(stylelintResults);
    }
    debug(`Linting complete in ${Date.now() - startTime}ms`);
    return returnValue;
  }
};

function handleError(error /*: Object*/) {
  if (error.name === "CssSyntaxError") {
    return convertCssSyntaxErrorToResult(error);
  } else {
    throw error;
  }
}

// By converting syntax errors to stylelint results,
// we can control their appearance in the formatted output
// and other tools like editor plugins can decide how to
// present them, as well
function convertCssSyntaxErrorToResult(
  error /*: CssSyntaxErrorT*/
) /*: stylelint$result*/ {
  if (error.name !== "CssSyntaxError") {
    throw error;
  }

  return {
    source: error.file || "<input css 1>",
    deprecations: [],
    invalidOptionWarnings: [],
    parseErrors: [],
    errored: true,
    warnings: [
      {
        line: error.line,
        column: error.column,
        rule: error.name,
        severity: "error",
        text: error.reason + " (" + error.name + ")"
      }
    ]
  };
}
