#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const migratedScopesConfigPath = path.join(
  repoRoot,
  'implementations/decouple-data-layer/migrated-ui-scopes.json',
);

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.mjs',
]);
const CLIENT_FOLDERS = [
  'src/components/',
  'src/features/',
  'src/hooks/',
  'src/providers/',
  'src/ui/',
];
const SERVER_FOLDERS = [
  'src/lib/actions/',
  'src/lib/helpers/',
  'src/lib/proxy/',
  'src/app/',
];

const violations = [];

function toPosix(inputPath) {
  return inputPath.split(path.sep).join('/');
}

function collectFiles(directoryPath) {
  const files = [];

  if (!fs.existsSync(directoryPath)) {
    return files;
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function hasUseClientDirective(fileContent) {
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"];?/.test(
    fileContent,
  );
}

function getStaticImportSpecifiers(fileContent) {
  const specifiers = new Set();
  const importFromPattern =
    /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  const sideEffectImportPattern = /import\s+['"]([^'"]+)['"]/g;
  const dynamicImportPattern = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const pattern of [
    importFromPattern,
    sideEffectImportPattern,
    dynamicImportPattern,
  ]) {
    for (const match of fileContent.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
}

function withoutSourceExtension(specifier) {
  return specifier.replace(/\.(?:[cm]?[jt]sx?)$/, '');
}

function isDataServerSpecifier(specifier) {
  const normalized = withoutSourceExtension(specifier.replaceAll('\\', '/'));
  return /(?:^|\/)lib\/data\/[^/]+\/server$/.test(normalized);
}

function isDataClientSpecifier(specifier) {
  const normalized = withoutSourceExtension(specifier.replaceAll('\\', '/'));
  return /(?:^|\/)lib\/data\/[^/]+\/client$/.test(normalized);
}

function isClientFile(relativePath, fileContent) {
  if (relativePath.includes('.client.')) {
    return true;
  }

  if (CLIENT_FOLDERS.some(prefix => relativePath.startsWith(prefix))) {
    return true;
  }

  return hasUseClientDirective(fileContent);
}

function isServerFile(relativePath, clientFile) {
  if (clientFile) {
    return false;
  }

  return SERVER_FOLDERS.some(prefix => relativePath.startsWith(prefix));
}

function isDataFacadeFile(relativePath) {
  return relativePath.startsWith('src/lib/data/');
}

function isUiAliasImport(specifier) {
  return /^(?:@ui\/|@components\/|@features\/|@hooks\/|@providers\/|@\/(?:ui|components|features|hooks|providers)\/)/.test(
    specifier,
  );
}

function resolvesToUiPath(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return false;
  }

  const resolvedPath = path.resolve(path.dirname(filePath), specifier);
  const relativeResolvedPath = toPosix(path.relative(repoRoot, resolvedPath));

  return /^(?:src\/ui\/|src\/components\/|src\/features\/|src\/hooks\/|src\/providers\/)/.test(
    relativeResolvedPath,
  );
}

function resolvesToTransportPath(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return false;
  }

  const resolvedPath = path.resolve(path.dirname(filePath), specifier);
  const relativeResolvedPath = toPosix(path.relative(repoRoot, resolvedPath));

  return /^(?:src\/lib\/(?:actions|helpers|supabase)\/)/.test(
    relativeResolvedPath,
  );
}

function isForbiddenUiTransportImport(specifier) {
  return /^(?:@supabase\/|@lib-supabase\/|@actions\/|@helpers\/|@\/lib\/(?:actions|helpers|supabase)\/)/.test(
    specifier,
  );
}

function loadMigratedScopes() {
  if (!fs.existsSync(migratedScopesConfigPath)) {
    return [];
  }

  try {
    const rawContent = fs.readFileSync(migratedScopesConfigPath, 'utf8');
    const parsed = JSON.parse(rawContent);
    const scopes = Array.isArray(parsed.scopes) ? parsed.scopes : [];

    return scopes
      .filter(scope => typeof scope === 'string' && scope.trim().length > 0)
      .map(scope =>
        scope.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''),
      );
  } catch (error) {
    violations.push(
      `Unable to parse ${toPosix(path.relative(repoRoot, migratedScopesConfigPath))}: ${String(error)}`,
    );
    return [];
  }
}

function isInsideScope(relativePath, scopes) {
  return scopes.some(
    scope => relativePath === scope || relativePath.startsWith(`${scope}/`),
  );
}

function validateFile(filePath, migratedScopes) {
  const relativePath = toPosix(path.relative(repoRoot, filePath));
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const specifiers = getStaticImportSpecifiers(fileContent);
  const clientFile = isClientFile(relativePath, fileContent);
  const serverFile = isServerFile(relativePath, clientFile);

  for (const specifier of specifiers) {
    if (clientFile && isDataServerSpecifier(specifier)) {
      violations.push(
        `${relativePath}: client file cannot import data server entrypoint (${specifier}).`,
      );
    }

    if (serverFile && isDataClientSpecifier(specifier)) {
      violations.push(
        `${relativePath}: server file cannot import data client entrypoint (${specifier}).`,
      );
    }

    if (isDataFacadeFile(relativePath)) {
      if (specifier.endsWith('.css')) {
        violations.push(
          `${relativePath}: data facade cannot import CSS (${specifier}).`,
        );
      }

      if (isUiAliasImport(specifier) || resolvesToUiPath(filePath, specifier)) {
        violations.push(
          `${relativePath}: data facade cannot import UI layer module (${specifier}).`,
        );
      }
    }

    if (isInsideScope(relativePath, migratedScopes)) {
      const directTransportImport =
        isForbiddenUiTransportImport(specifier) ||
        resolvesToTransportPath(filePath, specifier);

      if (!directTransportImport) {
        continue;
      }

      violations.push(
        `${relativePath}: migrated UI scope cannot import transport details directly (${specifier}).`,
      );
    }
  }

  if (isInsideScope(relativePath, migratedScopes)) {
    const rawApiFetchPattern =
      /\bfetch\s*\(\s*['"`]\/api\/[A-Za-z0-9\-_/]+['"`]/g;

    if (rawApiFetchPattern.test(fileContent)) {
      violations.push(
        `${relativePath}: migrated UI scope cannot call raw /api fetch directly.`,
      );
    }
  }
}

function main() {
  const migratedScopes = loadMigratedScopes();
  const sourceFiles = collectFiles(srcRoot);

  for (const filePath of sourceFiles) {
    validateFile(filePath, migratedScopes);
  }

  if (violations.length > 0) {
    console.error('Data boundary check failed.');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log('Data boundary checks passed.');
}

main();
