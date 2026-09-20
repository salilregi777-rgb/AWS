import type { AuthorizationCall } from '@cedar-policy/cedar-wasm/web';
import type { Incident, Team } from './relay';
export type Role = 'coordinator' | 'volunteer';
export const policies: Record<string,string> = {
 'coordinator-fusion': 'permit(principal, action == Relay::Action::"fuse", resource) when { principal.role == "coordinator" && principal.district == resource.district && resource.status == "open" && context.confirmed };',
 'coordinator-dispatch': 'permit(principal, action == Relay::Action::"dispatch", resource) when { principal.role == "coordinator" && principal.district == resource.district && resource.status == "open" && context.confirmed && context.skillsOk && context.capacityOk && context.teamAvailable && context.teamDistrictOk };',
 'coordinator-resolve': 'permit(principal, action == Relay::Action::"resolve", resource) when { principal.role == "coordinator" && principal.district == resource.district && resource.status == "dispatched" && context.confirmed };',
 'community-report': 'permit(principal, action == Relay::Action::"report", resource) when { (principal.role == "coordinator" || principal.role == "volunteer") && principal.district == resource.district };',
 'coordinator-required': 'forbid(principal, action, resource) when { (action == Relay::Action::"dispatch" || action == Relay::Action::"resolve") && principal.role != "coordinator" };',
 'district-boundary': 'forbid(principal, action, resource) when { principal.district != resource.district };',
 'human-confirmation': 'forbid(principal, action, resource) when { (action == Relay::Action::"dispatch" || action == Relay::Action::"resolve") && !context.confirmed };',
 'team-fit-required': 'forbid(principal, action == Relay::Action::"dispatch", resource) when { !context.skillsOk || !context.capacityOk || !context.teamAvailable || !context.teamDistrictOk };',
 'open-signal-required': 'forbid(principal, action == Relay::Action::"dispatch", resource) when { resource.status != "open" };',
 'dispatched-signal-required': 'forbid(principal, action == Relay::Action::"resolve", resource) when { resource.status != "dispatched" };',
};
export const policyDescriptions: Record<string,string> = {
 'coordinator-fusion':'A coordinator confirmed a supporting report for an open incident in their district.',
 'coordinator-dispatch':'Coordinator, district, human confirmation, team skill, availability, and capacity checks passed.',
 'coordinator-resolve':'A coordinator confirmed completion of a dispatched response.',
 'community-report':'Community members may submit a signal within their district.',
 'coordinator-required':'Only a coordinator can dispatch a team or resolve a response.',
 'district-boundary':'The coordinator and incident must belong to the same district.',
 'human-confirmation':'A human must explicitly confirm this response.',
 'team-fit-required':'Team skills, capacity, availability, and district must fit this signal.',
 'open-signal-required':'Only an open signal can receive a new assignment.',
 'dispatched-signal-required':'Only a dispatched signal can be marked resolved.',
};
export function createAuthorizationRequest({action,role,incident,team,incidents,confirmed,district='bengaluru'}:{action:'dispatch'|'resolve'|'report'|'fuse';role:Role;incident:Incident;team?:Team;incidents:Incident[];confirmed:boolean;district?:string}):AuthorizationCall {
 return {
  principal:{type:'Relay::User',id:'local-demo-user'}, action:{type:'Relay::Action',id:action}, resource:{type:'Relay::Incident',id:incident.id},
  context:{confirmed,skillsOk:!!team&&team.skill===incident.category,capacityOk:!!team&&team.capacity>=incident.people,teamAvailable:!!team&&!incidents.some(i=>i.status==='dispatched'&&i.teamId===team.id),teamDistrictOk:!!team&&team.district===incident.district},
  policies:{staticPolicies:policies}, entities:[{uid:{type:'Relay::User',id:'local-demo-user'},attrs:{role,district},parents:[]},{uid:{type:'Relay::Incident',id:incident.id},attrs:{district:incident.district,status:incident.status},parents:[]}],
 };
}
export const cedarSchema = `namespace Relay {
 entity User { role: String, district: String };
 entity Incident { district: String, status: String };
 action "dispatch", "resolve", "report", "fuse" appliesTo {
 principal: User, resource: Incident,
 context: { confirmed: Bool, skillsOk: Bool, capacityOk: Bool, teamAvailable: Bool, teamDistrictOk: Bool }
 };
}`;
