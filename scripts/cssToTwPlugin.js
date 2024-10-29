const Buffer = require('node:buffer').Buffer;
const path = require('node:path');
const through = require("through2");
const inspect = require("object-inspect");
const postcss = require('postcss');
const postcssJs  = require('postcss-js');

const COMPONENT_NAME_PLACEHOLDER = '%COMPONENT_NAME%';
const PLUGIN_FUNCTION_PLACEHOLDER = '%PLUGIN_FUNCTION%';
const CSS_OBJECT_PLACEHOLDER = '%CSS_OBJECT%';

const twPluginTemplate = `// Tailwind CSS plugin for the ${COMPONENT_NAME_PLACEHOLDER} component in the i-Cell Design System
module.exports = function ${PLUGIN_FUNCTION_PLACEHOLDER}() {
  return function ({ addComponents }) {
    const cssObj = ${CSS_OBJECT_PLACEHOLDER};

    addComponents(cssObj);
  };
}`;

function capitalize(input) {
  return `${input[0].toUpperCase()}${input.substring(1)}`;
}

function toPascalCase(input) {
  return input.split('-').map(section => capitalize(section)).join('');
}

module.exports = function cssToTwPlugin() {
  return through.obj(function transform(file, _encoding, callback) {
    // read CSS file content, convert it to CSS-in-JS then to a string representation
    const sourceCss = file.contents.toString('utf8');
    const parsedSource = postcss.parse(sourceCss);
    const cssInJs = postcssJs.objectify(parsedSource);
    const cssInJsAsString = inspect(cssInJs);

    // create the Tailwind plugin file content
    const componentName = file.basename.split('.')[0];
    const pluginFunctionName = `${toPascalCase(componentName)}Plugin`;
    const twPluginContent = twPluginTemplate
      .replace(COMPONENT_NAME_PLACEHOLDER, componentName)
      .replace(PLUGIN_FUNCTION_PLACEHOLDER, pluginFunctionName)
      .replace(CSS_OBJECT_PLACEHOLDER, cssInJsAsString);

    // export the content to its own separate plugin JS file
    file.contents = Buffer.from(twPluginContent);
    file.path = path.join(file.path.replace(file.basename, ''), `${componentName}.plugin.js`);

    callback(null, file);
  });
}
