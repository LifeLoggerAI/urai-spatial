import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const path = new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url);
const source = readFileSync(path, 'utf8');
const ast = ts.createSourceFile(path.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Compile only the actual production overview-navigation conditional, preserving
// its JSX branches and callbacks; no fake rewritten visibility predicate.
let expression;
function visit(node) {
  if (ts.isConditionalExpression(node) && ts.isJsxElement(node.whenTrue) &&
      node.whenTrue.openingElement.tagName.getText(ast) === 'nav' &&
      node.whenTrue.openingElement.attributes.properties.some(attr =>
        ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'className' &&
        attr.initializer?.getText(ast) === '"life-map-overview-controls"')) {
    assert.equal(expression, undefined, 'only one overview-navigation owner');
    expression = node.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(expression, 'real production overview navigation conditional must exist');
const compiled = ts.transpileModule(
  `const nav = ${expression}; module.exports.nav = nav;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
const jsxRuntime = {
  jsx: (type, props) => ({type, props}),
  jsxs: (type, props) => ({type, props}),
};
function render({ sourceMode, thresholdsVisible = false, recovery = false }) {
  const module = {exports: {}};
  let returnedHome = 0;
  const returnHome = () => { returnedHome++; };
  function AdamLauncherSlot() {}
  const compiledFn = new Function('module', 'exports', 'require', 'thresholdsVisible',
    'sourceMode', 'recovery', 'returnHome', 'AdamLauncherSlot', compiled);
  compiledFn(module, module.exports, name => {
    assert.equal(name, 'react/jsx-runtime');
    return jsxRuntime;
  }, thresholdsVisible, sourceMode, recovery, returnHome, AdamLauncherSlot);
  return {node: module.exports.nav, returnedHome: () => returnedHome, AdamLauncherSlot};
}
const children = node => [node?.props?.children].flat().filter(x => x != null);

test('signed-out overview provides accessible, clickable Home action without showing assistant', () => {
  const page = render({ sourceMode: 'signed-out' });
  assert.equal(page.node?.type, 'nav', 'no hidden signed-out trap on touch devices');
  assert.equal(page.node.props['aria-label'], 'Life Map overview controls');
  const contents = children(page.node);
  const home = contents.find(x => x?.type === 'button');
  assert.equal(home?.props?.['data-life-map-overview-home-return'], 'true');
  assert.equal(home?.props?.type, 'button');
  assert.equal(home?.props?.children, 'Return Home');
  home.props.onClick();
  assert.equal(page.returnedHome(), 1, 'original click returns to Home');
  assert.ok(!contents.some(x => x?.type === page.AdamLauncherSlot), 'do not expose assistant when signed out');
});

test('signed-in or explicitly demo overview preserves existing assistant slot', () => {
  for (const sourceMode of ['private', 'empty', 'explicit-demo']) {
    const page = render({ sourceMode });
    assert.equal(page.node?.type, 'nav');
    assert.ok(children(page.node).some(x => x?.type === page.AdamLauncherSlot));
  }
});

test('recovering renderer keeps a safe Home action and hides assistant', () => {
  const page = render({ sourceMode: 'private', recovery: true });
  assert.ok(children(page.node).some(x => x?.type === 'button'));
  assert.ok(!children(page.node).some(x => x?.type === page.AdamLauncherSlot));
});

test('selected memory continues to own its Focus/Replay navigation', () => {
  for (const sourceMode of ['signed-out', 'private', 'explicit-demo']) {
    assert.equal(render({ sourceMode, thresholdsVisible: true }).node, null);
  }
});
