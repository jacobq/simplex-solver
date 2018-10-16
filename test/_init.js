// FIXME: This hack allows simulatenous use of "Simplex/*" module namespace for TypeScript and plain|compiled JS (Simplex/* --> [dist/...])
const path = require('path');
const base = path.join(__dirname, '../dist/out/');

// Monkey-Patch _resolveFilename so we can replace/edit the file name
const Module = require('module').Module;
const original_resolveFilename = Module._resolveFilename;
const new_resolveFilename = function(filename, ...otherArgs) {
    let newFilename = (filename || "").replace(/^Simplex\//, base);
    //console.log("[DEBUG] Monkey-patched _resolveFilename", filename, newFilename, otherArgs);
    return original_resolveFilename.call(this, newFilename, ...otherArgs);
};
Module._resolveFilename = new_resolveFilename;
