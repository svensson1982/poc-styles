import { readFileSync, readdirSync } from 'fs';
import { program } from 'commander';

const COMPONENT_TOKEN_FILE = './node_modules/@i-cell/ids-tokens/css/component/component.css';
const SMC_REFERENCE_TOKEN_FILE = './node_modules/@i-cell/ids-tokens/css/smc/smc-reference.css';

function getStyleDirents(cssRootFolder) {
  try {
    const stylesDirents = readdirSync(cssRootFolder, { withFileTypes: true, recursive: true, encoding: 'utf-8' });
    return stylesDirents
      .filter((dirent) => dirent.path !== cssRootFolder)
      .filter((dirent) => dirent.isFile() && /.min.css$/.test(dirent.name));
  } catch (error) {
    program.error('No such directory for root of style files', { exitCode: 1, code: 'no.style.root' });
  }
}

function getFilteredStyleDirents(cssDirents = [], fileFilterPattern) {
  const filteredDirents = cssDirents.filter((dirent) => {
    const fileFullName = `${dirent.path}/${dirent.name}`;
    return new RegExp(fileFilterPattern).test(fileFullName);
  });

  if (filteredDirents.length === 0) {
    program.error('No matching style file found.', { exitCode: 2, code: 'no.matching.style.files' });
  }

  return filteredDirents;
}

function getStyleFileUsedTokens(fileFullName) {
  const cssVariableRegExp = /(?<=var\()(-|\w|\d)+(?=\))/g;
  const cssFileContent = readFileSync(fileFullName, { encoding: 'utf-8' });
  return cssFileContent.match(cssVariableRegExp);
}

function getTokenSet(tokenCssFile) {
  try {
    const tokenFileContent = readFileSync(tokenCssFile, { encoding: 'utf-8' });
    const tokenRegExp = /--(-|\w|\d)+(?=:.*;)/g;
    return new Set(tokenFileContent.match(tokenRegExp));
  } catch (error) {
    program.error('Token CSS file not found', { exitCode: 3, code: 'no.token.file.found' });
  }
}

function getMissingTokenSet(styleFiles, tokenSet) {
  const missingTokenSet = new Set();

  styleFiles.forEach((file) => {
    const fileFullName = `${file.path}/${file.name}`;
    const usedStyleTokenList = getStyleFileUsedTokens(fileFullName);

    usedStyleTokenList.forEach((usedToken) => {
      const tokenExists = tokenSet.has(usedToken);
      if (!tokenExists) {
        missingTokenSet.add(usedToken);
      }
    });
  });

  return missingTokenSet;
}

function logMissingTokens(styleFiles, missingTokenSet, limit) {
  const missingTokensCount = missingTokenSet.size;
  const missingTokenList = Array.from(missingTokenSet);
  const printableMissingTokens =
    limit === Infinity || missingTokensCount <= limit
      ? missingTokenList
      : [...missingTokenList.slice(0, limit), `...and ${missingTokensCount - limit} more.`];
  program.error(
    `${missingTokensCount} tokens are missing:
    
${printableMissingTokens.join('\n')}`,
    {
      exitCode: 4,
      code: 'tokens.missing',
    },
  );
}

function logStyleFiles(styleFiles = []) {
  console.log('Examined files:\n', styleFiles.map((file) => file.name).join('\n'), '\n');
}

program
  .name('check-missing-tokens')
  .version('1.0.0')
  .description('Script to check missing tokens in CSS files.')
  .arguments('<css-root-folder>', 'Root folder of style files')
  .arguments('[file-filter-pattern]', 'Pattern for filter style files')
  .option('-l, --limit <number>', 'Maximum number of missing tokens to log', parseInt)
  .action((cssRootFolder, fileFilterPattern = '') => {
    const options = program.opts();
    const limit = options.limit !== undefined ? options.limit : Infinity;

    const stylesDirents = getStyleDirents(cssRootFolder);
    const styleFiles = fileFilterPattern ? getFilteredStyleDirents(stylesDirents, fileFilterPattern) : stylesDirents;
    const componentTokens = getTokenSet(COMPONENT_TOKEN_FILE);
    const smcReferenceTokens = getTokenSet(SMC_REFERENCE_TOKEN_FILE);
    const tokenSet = new Set([...componentTokens, ...smcReferenceTokens]);
    const missingTokenSet = getMissingTokenSet(styleFiles, tokenSet);

    logStyleFiles(styleFiles);

    if (missingTokenSet.size > 0) {
      logMissingTokens(styleFiles, missingTokenSet, limit);
    }

    console.info('\x1b[30;102m Great! No tokens are missing. \x1b[0;0m');
  });

program.parse();
