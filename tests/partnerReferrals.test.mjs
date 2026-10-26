import test from 'node:test';
import assert from 'node:assert/strict';
import { getPartnerReferredStudents } from '../src/utils/partnerReferrals.js';
const partner={id:'aaaaaaaaaaaaaaaaaaaaaaaa',type:'Agent',name:'Contact Name',companyName:'Agency Ltd'};
const other={id:'bbbbbbbbbbbbbbbbbbbbbbbb',type:'Agent',name:'Other Contact',companyName:'Other Agency'};
const student={id:'cccccccccccccccccccccccc',type:'Student',name:'Student',email:'student@example.test',partner:partner.id,referredBy:'Agent',status:'Lead'};
test('counts students registered with partner ID despite generic referral label',()=>{
 assert.deepEqual(getPartnerReferredStudents(partner,[partner,other,student]),[student]);
});
test('combines registration and application references without counting multiple applications twice',()=>{
 const apps=[{partner:{_id:partner.id},student:{_id:student.id}},{partner:partner.id,studentId:student.id}];
 assert.deepEqual(getPartnerReferredStudents(partner,[partner,student],apps),[student]);
});
test('includes a student referred through an application even when registered elsewhere',()=>{
 const elsewhere={...student,partner:other.id};
 assert.deepEqual(getPartnerReferredStudents(partner,[partner,other,elsewhere],[{partner:partner.id,studentId:student.id}]),[elsewhere]);
});
test('does not associate explicit other-partner IDs through matching labels',()=>{
 assert.equal(getPartnerReferredStudents(partner,[partner,{...student,partner:other.id,referredBy:partner.name}]).length,0);
});
test('supports legacy company names and case/whitespace differences',()=>{
 const legacy={...student,partner:null,referredBy:'  AGENCY LTD  '};
 assert.deepEqual(getPartnerReferredStudents(partner,[partner,legacy]),[legacy]);
});
test('ambiguous same-name partners do not share legacy referrals',()=>{
 assert.equal(getPartnerReferredStudents(partner,[partner,{...other,name:partner.name},{...student,partner:null,referredBy:partner.name}]).length,0);
});
test('preserves application student profile when client directory lacks that student',()=>{
 const profile={_id:student.id,name:'Real Student',status:'Enrolled',email:'real@example.test'};
 const rows=getPartnerReferredStudents(partner,[partner],[{partner:partner.id,student:profile},{partner:partner.id,student:profile}]);
 assert.equal(rows.length,1);assert.equal(rows[0].name,'Real Student');assert.equal(rows[0].status,'Enrolled');
});
test('legacy applications match a unique existing student by email',()=>{
 assert.equal(getPartnerReferredStudents(partner,[partner,student],[{partner:partner.id,studentEmail:student.email}]).length,1);
});
test('identical emails do not merge students with different IDs',()=>{
 assert.equal(getPartnerReferredStudents(partner,[partner,student,{...student,id:'dddddddddddddddddddddddd'}]).length,2);
});
