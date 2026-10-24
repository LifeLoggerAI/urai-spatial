import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {lifeMapNodeIsHidden,lifeMapFocusAllowed,lifeMapVisibleRelatedNodes} from '../urai-tier1/src/components/lifemap/lifeMapPhysicalStarAction.mjs'
const src=readFileSync(new URL('../urai-tier1/src/components/lifemap/LifeMapSemanticNavigator.tsx',import.meta.url),'utf8')
test('selection search keyboard and inspector use one hidden predicate',()=>{assert.match(src,/lifeMapVisibleRelatedNodes, lifeMapNodeIsHidden/);assert.match(src,/node.id === selectedId && !lifeMapNodeIsHidden\(node\)/);assert.match(src,/!lifeMapNodeIsHidden\(node\) && !node\.locked && matchesSearch/);assert.match(src,/if \(lifeMapNodeIsHidden\(node\) \|\| node.locked\) return/);assert.match(src,/const candidates = \(visibleNodes.length \? visibleNodes : nodes\).filter\(node => !lifeMapNodeIsHidden\(node\) && !node.locked\)/);assert.doesNotMatch(src,/node.privacyLevel (?:===|!==) 'hidden'/)})
test('both hidden aliases deny semantic and Focus disclosure',()=>{const nodes=[{id:'a',privacyLevel:'hidden'},{id:'b',privacy:'hidden',privacyLevel:'private'},{id:'c',privacyLevel:'private'},{id:'d',locked:true}];assert.deepEqual(nodes.filter(x=>!lifeMapNodeIsHidden(x)&&!x.locked).map(x=>x.id),['c']);assert.equal(lifeMapFocusAllowed({...nodes[1],replayAvailable:true},'explicit-demo'),false);assert.deepEqual(lifeMapVisibleRelatedNodes(nodes,{id:'a',privacy:'hidden',connectedTo:['c']}),[])})

test('locked event cannot become an inspector deep link or clickable search control',()=>{
 assert.match(src,/node\.id === selectedId && !lifeMapNodeIsHidden\(node\) && !node\.locked/)
 assert.match(src,/className="life-map-semantic-result" disabled=\{node\.locked\}/)
 assert.match(src,/\.semantic-results button:disabled\{opacity:\.5;cursor:not-allowed\}/)
 const nodes=[
  {id:'open',connectedTo:['locked','visible','hidden','legacy']},
  {id:'locked',locked:true,title:'locked-context'},
  {id:'visible',title:'accessible-context'},
  {id:'hidden',privacyLevel:'hidden'},
  {id:'legacy',privacy:'hidden'},
 ]
 assert.deepEqual(lifeMapVisibleRelatedNodes(nodes,nodes[0]).map(x=>x.id),['visible'])
 assert.deepEqual(lifeMapVisibleRelatedNodes(nodes,nodes[1]),[])
 assert.equal(lifeMapFocusAllowed(nodes[1],'explicit-demo'),false)
})

test('locked memories never disclose titles, summaries, or search-match counts',()=>{
 assert.match(src,/\(\) => nodes\.filter\(\(node\) => !lifeMapNodeIsHidden\(node\) && !node\.locked && matchesSearch/)
 assert.match(src,/data-visible-count=\{visibleNodes\.length\}/)
 assert.match(src,/visibleNodes\.map\(\(node\) => <li key=\{node\.id\}>/)
 assert.doesNotMatch(src,/nodes\.filter\(\(node\) => !lifeMapNodeIsHidden\(node\) && matchesSearch/)
})
