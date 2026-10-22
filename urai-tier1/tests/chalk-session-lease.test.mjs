import test from 'node:test';
import assert from 'node:assert/strict';
import {isChalkSessionLeaseCurrent} from '../src/spatial/chalk/chalkSessionLease.mjs';
const baseline = () => ({ requestedUid:'founder_12345',currentUid:'founder_12345',requestedAuthEpoch:4,currentAuthEpoch:4,
 requestedRoute:'/life-map',currentRoute:'/life-map',requestedRouteEpoch:8,currentRouteEpoch:8 });
test('allows same authenticated owner on same navigation epoch',()=>assert.equal(isChalkSessionLeaseCurrent(baseline()),true));
for (const [name,mod] of [
 ['logout',{currentUid:null}],['account switch',{currentUid:'other_999999'}],
 ['auth re-entry',{currentAuthEpoch:5}],['route change',{currentRoute:'/focus'}],
 ['route ABA change',{currentRouteEpoch:10}],['forged epoch',{requestedAuthEpoch:'4'}],
 ['impossible route epoch',{requestedRouteEpoch:-1}],['missing owner',{requestedUid:''}],
 ['missing route',{requestedRoute:''}],['null',null],['array',[]],
]) test('denies '+name,()=>assert.equal(isChalkSessionLeaseCurrent(mod===null||Array.isArray(mod)?mod:{...baseline(),...mod}),false));
