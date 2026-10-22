'use client'
// No production bridge: separate locally signed-in Jobs and Spatial identities.
import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import { getUraiAuth, uraiJourneyEmulatorEnabled } from '@/lib/firebase/client'
import {assertChalkJobsLocalOperatorLogin,assertChalkJobsLocalOrigin} from './chalkJobsLocalOperatorAccess.mjs'
import {requireChalkJobsEmulator,chalkJobsDiagnosticRequest,chalkJobsIntakeReceipt,chalkJobsStatusProjection,type ChalkDiagnosticReference} from './chalkJobsTransportBoundary.mjs'
const JOBS_PROJECT='demo-urai-jobs', APP_NAME='chalk-jobs-local-emulator'
let authAttached=false, functionsAttached=false
function emulatorClient(){
 const spatialAuth=getUraiAuth()
 requireChalkJobsEmulator({environment:process.env.NODE_ENV??'unknown',journeyEmulatorEnabled:uraiJourneyEmulatorEnabled,spatialProjectId:spatialAuth.app.options.projectId??'',jobsProjectId:JOBS_PROJECT})
 const app=getApps().find(a=>a.name===APP_NAME)??initializeApp({apiKey:'demo-api-key',authDomain:`${JOBS_PROJECT}.firebaseapp.com`,projectId:JOBS_PROJECT,appId:`${JOBS_PROJECT}-chalk-local`},APP_NAME)
 const jobsAuth=getAuth(app)
 if(!authAttached){connectAuthEmulator(jobsAuth,'http://127.0.0.1:9099',{disableWarnings:true});authAttached=true}
 const f=getFunctions(app,'us-central1')
 if(!functionsAttached){connectFunctionsEmulator(f,'127.0.0.1',5001);functionsAttached=true}
 return {spatialAuth,jobsAuth,f}
}
export function chalkJobsEmulatorSessionReady(){try{const {spatialAuth,jobsAuth}=emulatorClient();return Boolean(spatialAuth.currentUser&&jobsAuth.currentUser)}catch{return false}}
async function protectedCall(payload:Record<string,unknown>):Promise<unknown>{
 const {spatialAuth,jobsAuth,f}=emulatorClient(),origin=spatialAuth.currentUser,operator=jobsAuth.currentUser
 if(!origin||!operator)throw Error('CHALK_JOBS_INDEPENDENT_SIGN_IN_REQUIRED')
 const [spatialIdToken]=await Promise.all([origin.getIdToken(true),operator.getIdToken(true)])
 if(spatialAuth.currentUser!==origin||jobsAuth.currentUser!==operator)throw Error('CHALK_JOBS_ACCOUNT_CHANGED')
 const callable=httpsCallable<Record<string,unknown>,unknown>(f,'chalkSpatialJobsBridge',{timeout:25000})
 const result=await callable({...payload,spatialIdToken})
 if(spatialAuth.currentUser!==origin||jobsAuth.currentUser!==operator)throw Error('CHALK_JOBS_ACCOUNT_CHANGED')
 return result.data
}
export async function readChalkEmulatorJobs(){return chalkJobsStatusProjection(await protectedCall({operation:'read',limit:40}))}
export async function submitChalkEmulatorDiagnostic(input:{problem:string;requestId:string;diagnostic:ChalkDiagnosticReference;sourceSha:string}){
 return chalkJobsIntakeReceipt(await protectedCall(chalkJobsDiagnosticRequest(input)))
}

// A separate, explicit Jobs emulator login. Never store credentials or silently
// provision an operator; the Jobs backend still checks current server-owned grants.
export async function signInChalkJobsLocalOperator(email:string,password:string){
 const {jobsAuth}=emulatorClient()
 assertChalkJobsLocalOperatorLogin({hostname:window.location.hostname,email,password})
 await setPersistence(jobsAuth,inMemoryPersistence)
 const user=await signInWithEmailAndPassword(jobsAuth,email,password)
 return {uid:user.user.uid}
}
export async function signOutChalkJobsLocalOperator(){
 assertChalkJobsLocalOrigin(window.location.hostname)
 const {jobsAuth}=emulatorClient()
 await signOut(jobsAuth)
}
