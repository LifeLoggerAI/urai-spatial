import test from 'node:test';import assert from 'node:assert/strict';
import {chalkRouteEpochCurrent} from '../src/spatial/chalk/chalkRouteEpoch.mjs';
const x=()=>({startRoute:'/focus',currentPathname:'/focus',startEpoch:7,currentEpoch:7});
test('same route and generation valid',()=>assert.equal(chalkRouteEpochCurrent(x()),true));
test('navigated away is stale',()=>assert.equal(chalkRouteEpochCurrent({...x(),currentPathname:'/replay'}),false));
test('navigated away and back is stale',()=>assert.equal(chalkRouteEpochCurrent({...x(),currentEpoch:9}),false));
test('unexpected route is stale',()=>assert.equal(chalkRouteEpochCurrent({...x(),startRoute:'/settings'}),false));
test('invalid epoch is stale',()=>assert.equal(chalkRouteEpochCurrent({...x(),currentEpoch:NaN}),false));
