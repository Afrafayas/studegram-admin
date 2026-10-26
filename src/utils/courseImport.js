const currencyCodes = ['INR','USD','GBP','EUR','CAD','AUD','NZD','SGD','AED','SAR','CHF','JPY','CNY','MYR'];
const normalizeKey = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/&|\+/g,'and').replace(/[^\p{L}\p{N}]/gu,'');
const months = [['jan','january'],['feb','february'],['mar','march'],['apr','april'],['may'],['jun','june'],['jul','july'],['aug','august'],['sep','sept','september'],['oct','october'],['nov','november'],['dec','december']];
function normalizeIntake(value) {
 let text = String(value ?? '').toLowerCase();
 for (const names of months) text=text.replace(new RegExp('(?<![a-z])(?:'+names.slice().sort((a,b)=>b.length-a.length).join('|')+')(?![a-z])','g'),names[names.length-1]);
 const key=normalizeKey(text);
 const reverse=key.match(/^(\d{4})([a-z]+)$/);
 return reverse ? reverse[2]+reverse[1] : key;
}
const aliases = {
 title:['Course Program Title','Course Title','Title','Course Name'],
 university:['Assign University','University Name','University','Institution'],
 degree:['Degree Level','Degree','Level'], duration:['Duration','Duration Years Months','Course Duration'],
 tuitionFee:['Tuition Fee','Tuition Fees','Course Fee','Fee','Tuition Amount'],
 currency:['Currency','Fee Currency','Tuition Currency','Currency Code'],
 feePeriod:['Fee Period','Tuition Fee Period','Tuition Period','Fee Basis','Fee Frequency'],
 category:['Category','Course Category'], description:['Course Overview & Description','Course Overview Description','Description','Overview'],
 intakes:['Available Intakes','Intakes','Intake']
};
function readRow(row) {
 const cells=new Map(Object.entries(row).map(([key,value])=>[normalizeKey(key),value]));
 return Object.fromEntries(Object.entries(aliases).map(([field,names])=>[field,String(names.map(name=>cells.get(normalizeKey(name))).find(value=>value!==undefined && String(value).trim()!=='') ?? '').trim()]));
}
function headerErrors(headers) {
 const seen=new Set();const errors=[];
 for(const header of headers){const key=normalizeKey(header);if(!key)continue;if(seen.has(key))errors.push('Duplicate column: '+header);seen.add(key);}
 for(const field of ['title','university'])if(!aliases[field].some(name=>seen.has(normalizeKey(name))))errors.push('Missing required column: '+aliases[field][0]);
 for(const names of Object.values(aliases)){const found=names.filter(name=>seen.has(normalizeKey(name)));if(found.length>1)errors.push('Use only one column for '+names[0]+': '+found.join(', '));}
 return errors;
}
function mapDegreeLevel(raw) {
 const key=normalizeKey(raw);if(!key)return 'Bachelor';
 return ({bachelor:'Bachelor',bachelors:'Bachelor',bachelordegree:'Bachelor',bachelorsdegree:'Bachelor',undergraduate:'Bachelor',ug:'Bachelor',bsc:'Bachelor',ba:'Bachelor',bba:'Bachelor',beng:'Bachelor',master:'Master',masters:'Master',masterdegree:'Master',mastersdegree:'Master',postgraduate:'Master',pg:'Master',msc:'Master',ma:'Master',mba:'Master',meng:'Master',phd:'PhD',doctorate:'PhD',doctoratephd:'PhD',doctorateandphd:'PhD',doctorofphilosophy:'PhD',diploma:'Diploma',foundation:'Diploma',diplomafoundation:'Diploma',diplomaandfoundation:'Diploma',certificate:'Certificate',certification:'Certificate'})[key] || null;
}
function mapCategory(raw) {
 const key=normalizeKey(raw);if(!key)return 'Technology';
 return ({technology:'Technology',engineering:'Technology',technologyandengineering:'Technology',technologyengineering:'Technology',business:'Business',management:'Business',businessandmanagement:'Business',businessmanagement:'Business',arts:'Arts',humanities:'Arts',artsandhumanities:'Arts',artshumanities:'Arts',science:'Science',naturalsciences:'Science',health:'Health',medicine:'Health',medicineandhealth:'Health',medicinehealth:'Health'})[key] || null;
}
function inferPeriod(value) {
 if(/semester/i.test(value))return 'semester';
 if(/complete\s*course|full\s*course|entire\s*course|course\s*duration/i.test(value))return 'course';
 if(/\/\s*(yr|year)|per\s*year|annual/i.test(value))return 'year';
 return '';
}
function mapFeePeriod(raw, fee='') {
 const key=normalizeKey(raw);if(!key)return inferPeriod(fee);
 return ({year:'year',yearly:'year',peryear:'year',oneyear:'year',annual:'year',annually:'year',yr:'year',peryr:'year',semester:'semester',persemester:'semester',onesemester:'semester',semesterly:'semester',course:'course',completecourse:'course',fullcourse:'course',entirecourse:'course',total:'course',totalcourse:'course',courseduration:'course',completecourseduration:'course',forthecompletecourseduration:'course',notspecified:''})[key] ?? null;
}
function mapCurrency(raw, fee='') {
 const key=normalizeKey(raw);
 const aliases={rupee:'INR',rupees:'INR',indianrupee:'INR',indianrupees:'INR',rs:'INR',usdollar:'USD',usdollars:'USD',pound:'GBP',pounds:'GBP',poundsterling:'GBP',britishpound:'GBP',euro:'EUR',euros:'EUR',canadiandollar:'CAD',australiandollar:'AUD',newzealanddollar:'NZD',singaporedollar:'SGD',dirham:'AED',dirhams:'AED'};
 if(raw){const code=currencyCodes.find(code=>normalizeKey(code)===key);return code || aliases[key] || ({'₹':'INR','$':'USD','£':'GBP','€':'EUR','¥':'JPY'})[raw.trim()] || null;}
 const embedded=String(fee).match(/^\s*([a-z]{3})\s*(?=\d)/i);
 if(embedded && !currencyCodes.includes(embedded[1].toUpperCase())) return null;
 return embedded ? embedded[1].toUpperCase() : String(fee).includes('£') ? 'GBP' : String(fee).includes('€') ? 'EUR' : String(fee).includes('$') ? 'USD' : 'INR';
}
function validFee(value) {
 return !value || /^(?:[A-Z]{3}\s*|[₹$£€¥]\s*)?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?(?:\s*\/\s*(?:yr|year|semester|complete\s*course))?$/i.test(String(value).trim());
}
function splitIntakes(raw) {
 return String(raw).replace(/([a-z]+)\s*,\s*(\d{4})/gi,'$1 $2').split(/[,;|\r\n]+/).map(value=>value.trim()).filter(Boolean);
}
function buildLookup(records,field,normalize=normalizeKey) {
 const map=new Map();for(const record of records){const key=normalize(record[field]);if(key)map.set(key,[...(map.get(key)||[]),record]);}return map;
}
export {currencyCodes,normalizeKey,normalizeIntake,readRow,headerErrors,mapDegreeLevel,mapCategory,mapFeePeriod,mapCurrency,splitIntakes,buildLookup,validFee};
