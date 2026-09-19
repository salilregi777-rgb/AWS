import type { AuthorizationCall } from '@cedar-policy/cedar-wasm/web';
export type PolicyDecision={allowed:boolean;decision:'Allow'|'Deny';reasons:string[];errors:string[];version:string;durationMs:number};
let engine:Promise<typeof import('@cedar-policy/cedar-wasm/web')>|undefined;
export function loadCedar(){
 if(!engine)engine=import('@cedar-policy/cedar-wasm/web').then(async cedar=>{await cedar.default({module_or_path:'/cedar/cedar_wasm_bg.wasm'});return cedar;}).catch(e=>{engine=undefined;throw e;});
 return engine;
}
export async function authorize(request:AuthorizationCall):Promise<PolicyDecision>{
 const cedar=await loadCedar(),start=performance.now();
 const result=cedar.isAuthorized(request);
 if(result.type!=='success')return {allowed:false,decision:'Deny',reasons:[],errors:['Cedar could not evaluate this request. No changes were made.'],version:cedar.getCedarVersion(),durationMs:performance.now()-start};
 const errors=result.response.diagnostics.errors.map(e=>e.error.message);
 const allowed=result.response.decision==='allow'&&errors.length===0;
 return {allowed,decision:allowed?'Allow':'Deny',reasons:result.response.diagnostics.reason,errors,version:cedar.getCedarVersion(),durationMs:performance.now()-start};
}
