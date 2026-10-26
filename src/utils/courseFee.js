export const currencies = ['INR','USD','GBP','EUR','CAD','AUD','NZD','SGD','AED','SAR','CHF','JPY','CNY','MYR'];
export function feeCurrency(value, currency) {
 if(currency) return currency;
 const text=String(value ?? ''); const code=text.match(/\b(INR|USD|GBP|EUR|CAD|AUD|NZD|SGD|AED|SAR|CHF|JPY|CNY|MYR)\b/i);
 return code ? code[1].toUpperCase() : text.includes('£') ? 'GBP' : text.includes('€') ? 'EUR' : text.includes('$') ? 'USD' : 'INR';
}
export function parseFee(value) {
 if(typeof value==='number') return Number.isFinite(value) && value>=0 ? value : null;
 const match=String(value ?? '').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/); const amount=match ? Number(match[0]) : NaN;
 return Number.isFinite(amount) && amount>=0 ? amount : null;
}
export const feePeriods = [{value:'year',label:'Per year'}, {value:'semester',label:'Per semester'}, {value:'course',label:'Complete course'}];
export function inferFeePeriod(value, period) {
 if (feePeriods.some(item => item.value === period)) return period;
 const text = String(value ?? '');
 if (/semester/i.test(text)) return 'semester';
 if (/complete\s+course|full\s+course|entire\s+course|course\s+duration/i.test(text)) return 'course';
 if (/\/\s*(yr|year)|per\s+year|annual/i.test(text)) return 'year';
 return '';
}
export function formatFee(value,currency,period) {
 const amount=parseFee(value);
 if(amount===null) return value && !/nan/i.test(String(value)) ? String(value) : 'Not specified';
 const resolvedPeriod = inferFeePeriod(value, period);
 const suffix = resolvedPeriod === 'year' ? ' / year' : resolvedPeriod === 'semester' ? ' / semester' : resolvedPeriod === 'course' ? ' / complete course' : (typeof value === 'string' ? value.match(/\s*\/.*$/)?.[0] || '' : '');
 return feeCurrency(value,currency)+' '+amount.toLocaleString('en-IN',{maximumFractionDigits:2})+suffix;
}
export function applicationFee(app) { return formatFee(app.tuitionFee ?? app.courseFee ?? app.course?.tuitionFee,app.currency || app.course?.currency, app.feePeriod ?? app.course?.feePeriod); }
