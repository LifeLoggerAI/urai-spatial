'use strict'
const assert=require('node:assert/strict')
const admin=require('firebase-admin')
const {collectExportPages,createExportReadBudget}=require('../lib/apps/functions/src/exportPagination.js')
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8288'||process.env.GCLOUD_PROJECT!=='demo-spatial-export-pages')throw new Error('Isolated demo Firestore is required')
admin.initializeApp({projectId:'demo-spatial-export-pages'})
const db=admin.firestore()
async function main(){
  const ref=db.collection('syntheticExportOwners').doc('fictional-owner').collection('memories')
  for(let offset=0;offset<1001;offset+=400){const batch=db.batch();for(let i=offset;i<Math.min(offset+400,1001);i++)batch.set(ref.doc(`memory-${String(i).padStart(4,'0')}`),{meaning:i});await batch.commit()}
  const budget=createExportReadBudget();let queries=0
  const output=await db.runTransaction(async transaction=>{
    const reader={get:async query=>{const page=await transaction.get(query);queries++;if(queries===1){await ref.doc('memory-0300').delete();await ref.doc('memory-0400').update({meaning:'later-correction'});await ref.doc('memory-1001').set({meaning:'later-insertion'})}return page}}
    return collectExportPages(reader,ref,budget,doc=>({id:doc.id,...doc.data()}))
  },{readOnly:true})
  assert.equal(output.length,1001);assert.deepEqual(output.map(row=>row.meaning),Array.from({length:1001},(_,i)=>i))
  assert.equal(queries,5);assert.equal(budget.documents,1001);assert.ok(Number.isSafeInteger(budget.snapshotMillis))
  assert.equal((await ref.doc('memory-0400').get()).get('meaning'),'later-correction')
  console.log(JSON.stringify({proof:'PASS',project:'demo-spatial-export-pages',actualSdk:true,actualFirestoreLoaded:true,actualFunctionsLoaded:false,records:output.length,pages:queries,snapshotMillis:budget.snapshotMillis,crossPageInsertionDeletionCorrectionExcluded:true}))
  await db.recursiveDelete(db.collection('syntheticExportOwners').doc('fictional-owner'))
  await db.terminate();await admin.app().delete()
}
main().catch(error=>{console.error(error);process.exitCode=1})
