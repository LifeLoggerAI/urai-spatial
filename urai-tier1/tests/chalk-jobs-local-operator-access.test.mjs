import test from 'node:test';
import assert from 'node:assert/strict';
import { assertChalkJobsLocalOperatorLogin, assertChalkJobsLocalOrigin } from '../src/spatial/chalk/chalkJobsLocalOperatorAccess.mjs';
const valid = () => ({ hostname: 'localhost', email: 'founder@synthetic.test', password: 'locally-test-only' });
test('allows synthetic operator on localhost without returning credentials', () => {
  assert.equal(assertChalkJobsLocalOperatorLogin(valid()), true);
});
for (const hostname of ['127.0.0.1', '::1', '[::1]']) test('local origin '+hostname, () =>
  assert.equal(assertChalkJobsLocalOperatorLogin({...valid(), hostname}), true));
for (const hostname of ['example.com','localhost.example.com','127.0.0.1.evil','192.168.1.2','',null,undefined])
  test('rejects external origin '+String(hostname), () => {
    assert.throws(() => assertChalkJobsLocalOrigin(hostname), /ORIGIN/);
    assert.throws(() => assertChalkJobsLocalOperatorLogin({...valid(), hostname}), /ORIGIN/);
  });
for (const email of ['bad','test@','a@b','x@synthetic.test\n', 'x@synthetic.test ',null,'a'.repeat(256)+'@test.local'])
  test('rejects invalid email', () => assert.throws(() =>
    assertChalkJobsLocalOperatorLogin({...valid(),email}), /EMAIL/));
for (const password of ['tiny', '', null, 'secret\nline', 'x'.repeat(257)])
  test('rejects malformed password', () => assert.throws(() =>
    assertChalkJobsLocalOperatorLogin({...valid(),password}), /PASSWORD/));
test('emits only success and no user credentials', () => {
  assert.equal(assertChalkJobsLocalOperatorLogin(valid()), true);
  assert.deepEqual(Object.keys({}),[]); // contract deliberately has no credential projection
});
