import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import * as nodeModule from 'node:module';
import * as path from 'node:path';
import { runInNewContext } from 'node:vm';
import { Worker } from 'node:worker_threads';
import ts from 'typescript';
import type { QuerySqlResult } from '@/agent/tools/sql-types';

// Run after pnpm build. Exercise the emitted worker, not its source module:
// bundlers can turn require.resolve into a module ID that Node cannot require.
async function main() {
  const tracePath = path.resolve(
    '.next/server/app/api/momo-stream/route.js.nft.json',
  );
  assert(existsSync(tracePath), 'Run pnpm build before this packaging smoke.');
  const trace = JSON.parse(readFileSync(tracePath, 'utf8')) as {
    files: string[];
  };
  const tracedPaths = trace.files.map(file =>
    path.resolve(path.dirname(tracePath), file),
  );
  const chunks = tracedPaths.filter(
    file => file.includes('/server/chunks/') && file.endsWith('.js'),
  );
  let workerSource: string | undefined;
  let modulePathExpression: string | undefined;
  let chunkPath: string | undefined;
  const nativeBindings: Record<string, unknown> = { process };

  for (const filename of chunks) {
    const source = readFileSync(filename, 'utf8');
    if (
      !source.includes('modulePath:') ||
      !source.includes('PRAGMA hard_heap_limit')
    )
      continue;
    const ast = ts.createSourceFile(
      filename,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isTaggedTemplateExpression(node) &&
        node.tag.getText(ast) === 'String.raw' &&
        node.template.getText(ast).includes('parentPort')
      ) {
        workerSource = runInNewContext(
          node.getText(ast),
          {},
          { timeout: 1000 },
        );
      }
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText(ast) === 'modulePath'
      ) {
        modulePathExpression = node.initializer.getText(ast);
        const findNativeBinding = (expression: ts.Node) => {
          if (
            ts.isPropertyAccessExpression(expression) &&
            ts.isIdentifier(expression.expression)
          ) {
            if (expression.name.text === 'createRequire')
              nativeBindings[expression.expression.text] = nodeModule;
            if (expression.name.text === 'resolve')
              nativeBindings[expression.expression.text] = path;
          }
          ts.forEachChild(expression, findNativeBinding);
        };
        findNativeBinding(node.initializer);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    if (workerSource && modulePathExpression) {
      chunkPath = filename;
      break;
    }
  }
  assert(
    workerSource && modulePathExpression && chunkPath,
    'No compiled SQL worker found in the route trace.',
  );
  const modulePath: unknown = runInNewContext(
    modulePathExpression,
    nativeBindings,
    { timeout: 1000 },
  );
  assert(
    typeof modulePath === 'string' && path.isAbsolute(modulePath),
    'Compiled worker dependency must resolve to an absolute path, not a bundler module ID.',
  );
  assert(existsSync(modulePath), 'Resolved worker dependency is missing.');
  assert(
    tracedPaths.some(
      file =>
        existsSync(file) && realpathSync(file) === realpathSync(modulePath),
    ),
    'Resolved SQL dependency is absent from the deployment trace.',
  );

  const compiledWorkerSource = workerSource;
  const result = await new Promise<QuerySqlResult>((resolve, reject) => {
    const worker = new Worker(compiledWorkerSource, {
      eval: true,
      env: {},
      workerData: {
        modulePath,
        currency: 'COP',
        rows: [
          {
            id: 'fixture',
            user_id: 'fixture-user',
            household_id: null,
            amount_cents: 29_298_000,
            currency: 'COP',
            expense_date: '2026-04-24',
            merchant: null,
            category: 'food',
            note: 'Café',
            tags: [],
          },
        ],
        input: {
          scope: 'personal',
          sql: 'SELECT sum(amount_cents) AS total, format_money(sum(amount_cents)) AS formatted, normalize_text(note) AS normalized FROM expenses',
          parameters: [],
        },
      },
    });
    let settled = false;
    const finish = (error?: Error, value?: QuerySqlResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error);
      else if (value) resolve(value);
    };
    const timer = setTimeout(
      () => finish(new Error('Built worker smoke timed out.')),
      5000,
    );
    worker.once('message', value => finish(undefined, value));
    worker.once('error', error => finish(error));
    worker.once('exit', code =>
      finish(new Error(`Built worker exited before a result (${code}).`)),
    );
  });
  assert.deepEqual(result, {
    rows: [
      { total: 29_298_000, formatted: 'COP 29,298,000', normalized: 'cafe' },
    ],
    truncated: false,
    currency: 'COP',
  });
  console.log(
    `PASS: compiled SQL worker, runtime dependency resolution and deployment trace (${path.basename(chunkPath)}).`,
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
