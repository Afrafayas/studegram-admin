import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

// All API responses in this test are intercepted fixtures. No live API calls or database writes.
const workspace = path.resolve('.');
const scratch = path.join(workspace, '.audit-work/browser');
fs.mkdirSync(scratch, { recursive: true });
const fixturePath = path.join(scratch, 'Passport Original.png');
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ONsAAAAASUVORK5CYII=';
fs.writeFileSync(fixturePath, Buffer.from(png, 'base64'));
const id = digit => digit.repeat(24);
const user = { _id: id('1'), id: id('1'), name: 'Flow Admin', email: 'flow-admin@example.test', role: 'SuperAdmin', country: 'All', status: 'Active', createdAt: '2028-01-01' };
const partner = { _id: id('2'), id: id('2'), name: 'Flow Agency', companyName: 'Flow Agency', email: 'flow-agent@example.test', status: 'Active', role: 'AgencyAdmin', permissions: ['*'], country: 'India', isEmailVerified: true, createdAt: '2028-01-01' };
const intake = { _id: id('3'), title: 'April 2028', description: '' };
const university = { _id: id('4'), name: 'Flow University', country: 'United Kingdom', city: 'Flow City', description: 'Published university description', ranking: 'Recorded ranking', requirements: ['Recorded entry requirement'], courses: [], status: 'Active', createdAt: '2028-01-01' };
const course = { _id: id('5'), title: 'Flow Computer Science', university, degreeLevel: 'Master', duration: '2 Years', tuitionFee: 'GBP 12345', intakes: [intake], description: 'Published course description' };
const student = { _id: id('6'), name: 'Flow Student', email: 'flow-student@example.test', phone: '+91 9000000000', passportNo: 'ORIGINAL123', dob: '2002-01-02', partner, createdAt: '2028-01-01', status: 'Applied' };
const document = { name: 'Passport Original.png', url: 'http://127.0.0.1:4175/__files__/Passport%20Original.png', uploadedAt: '2028-01-01T00:00:00Z' };
const originalApplication = { _id: id('7'), camsId: 'CAMS-ORIGINAL-7', student, course, university, partner, intake: intake.title, level: 'Postgraduate (PG)', status: 'Submitted', paymentStatus: 'Pending', documents: [document], applicationComments: [], statusHistory: [], createdAt: '2028-01-01T10:00:00Z', updatedAt: '2028-01-01T10:00:00Z', commissionAmount: 900, commissionRate: 6, isCommissionSet: true };
const commission = { _id: id('8'), commissionId: 'COM-ORIGINAL-8', application: originalApplication, student, partner, studentName: student.name, partnerName: partner.name, courseName: course.title, amount: 900, rate: 6, fee: 15000, tuitionFee: 15000, status: 'Claimed', isCommissionSet: true };
let applications = [originalApplication];
let todos = [];
let failSubmit = false;
let failLogin = false;
let emptyResources = false;
let nextApplication = 10;
const requests = [];
const runtimeErrors = [];
const passes = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const pass = message => { passes.push(message); console.log(`PASS ${message}`); };

class CDP {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => { this.socket.onopen = resolve; this.socket.onerror = reject; });
    this.socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
      } else for (const listener of this.listeners.get(message.method) || []) listener(message.params);
    };
  }
  async send(method, params = {}) {
    await this.ready;
    const id = ++this.sequence;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.socket.send(JSON.stringify({ id, method, params })); });
  }
  on(name, handler) { this.listeners.set(name, [...(this.listeners.get(name) || []), handler]); }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async until(expression, description, timeout = 12000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try { if (await this.evaluate(expression)) return; } catch { /* Navigation replaces execution contexts. */ }
      await pause(100);
    }
    const text = await this.evaluate('document.body.innerText').catch(() => 'Unavailable');
    fs.writeFileSync(path.join(scratch, 'failure.txt'), text);
    throw new Error(`Timed out: ${description}. Page text saved to .audit-work/browser/failure.txt`);
  }
  async click(text, exact = false) {
    await this.evaluate(`(() => { const wanted = ${JSON.stringify(text)}; const normal = value => value.replace(/\\s+/g, ' ').trim(); const button = [...document.querySelectorAll('button')].find(b => ${exact ? 'normal(b.textContent) === wanted' : 'normal(b.textContent).includes(wanted)'} && !b.disabled); if (!button) throw new Error('Button not found: ' + wanted); button.click(); })()`);
    await pause(150);
  }
  async field(label, value) {
    await this.evaluate(`(() => { const wanted = ${JSON.stringify(label)}; const label = [...document.querySelectorAll('label')].find(l => l.textContent.includes(wanted)); let parent = label; let element = label?.control; while (!element && parent && parent.tagName !== 'FORM') { element = parent.querySelector('input,select,textarea'); parent = parent.parentElement; } if (!element) throw new Error('Field not found: ' + wanted); const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', {bubbles: true})); element.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    await pause(100);
  }
  async selectOption(text) {
    await this.evaluate(`(() => {const option = [...document.querySelectorAll('select option')].reverse().find(o => o.textContent.includes(${JSON.stringify(text)})); if (!option) throw new Error('Option not found: ' + ${JSON.stringify(text)}); const select = option.parentElement; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, option.value); select.dispatchEvent(new Event('change', {bubbles: true}));})()`);
    await pause(120);
  }
  async upload() {
    const { root } = await this.send('DOM.getDocument');
    const { nodeId } = await this.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' });
    assert.ok(nodeId, 'Upload input exists');
    await this.send('DOM.setFileInputFiles', { nodeId, files: [fixturePath] });
    await pause(350);
  }
}

async function intercept(client, event) {
  const url = new URL(event.request.url);
  const route = url.pathname.replace(/^\/api(?=\/)/, '');
  if (route.startsWith('/__files__/')) {
    return client.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/png' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: png });
  }
  const api = /^\/(auth|partners|students|applications|universities|courses|intakes|users|commissions|roles|notifications|activity-logs|todos|notices|webinars|scholarships|upload)(\/|$)/.test(route);
  if (!api && ['http://127.0.0.1:4175', 'http://127.0.0.1:4176'].includes(url.origin)) return client.send('Fetch.continueRequest', { requestId: event.requestId });
  let status = 200;
  let result = { success: true, data: [] };
  const method = event.request.method;
  const body = (() => { try { return JSON.parse(event.request.postData || '{}'); } catch { return {}; } })();
  if (api && method !== 'OPTIONS') requests.push({ route, method, body });
  if (/\/(auth|partners)\/login$/.test(route)) {
    if (failLogin) { status = 401; result = { success: false, message: 'Invalid credentials from test API' }; }
    else result = { success: true, token: 'isolated-browser-test-token', sessionId: 'browser-test-session', data: route.startsWith('/auth') ? user : partner };
  } else if (route === '/partners/me') result.data = partner;
  else if (route === '/partners') result.data = [partner];
  else if (route === '/students') result.data = method === 'POST' ? { ...student, ...body, _id: id('9') } : [student];
  else if (route === '/universities') result.data = emptyResources ? [] : [{ ...university, courses: [course] }];
  else if (route === '/courses') result.data = emptyResources ? [] : [course];
  else if (route === '/intakes') result.data = [intake];
  else if (route === '/users') result.data = [user];
  else if (route === '/roles') result.data = [{ _id: id('a'), name: 'SuperAdmin', displayName: 'Flow Administrator', portalType: 'Admin', permissions: ['*'] }, { _id: id('b'), name: 'AgencyAdmin', displayName: 'Flow Agency Owner', portalType: 'Agent', permissions: ['*'] }];
  else if (route === '/commissions') result.data = [commission];
  else if (route === '/applications' && method === 'POST') {
    if (failSubmit) { status = 400; result = { success: false, message: 'Submission rejected for test.' }; }
    else { const app = { ...originalApplication, camsId: `CAMS-ORIGINAL-${nextApplication}`, _id: String(nextApplication++).padStart(24, '0'), intake: body.intake, notes: body.notes, documents: body.documents }; applications = [app, ...applications]; result.data = app; }
  } else if (route === '/applications') result.data = applications;
  else if (/^\/applications\/[a-f0-9]{24}$/.test(route)) result.data = applications.find(app => app._id === route.split('/').pop()) || originalApplication;
  else if (/\/applications\/[a-f0-9]{24}\/comments$/.test(route) && method === 'POST') { originalApplication.applicationComments.push({ text: body.text, author: partner.name, createdAt: new Date().toISOString() }); result.data = originalApplication.applicationComments; }
  else if (route === '/upload') result = { success: true, url: document.url, fileUrl: document.url };
  else if (route === '/activity-logs/stats') result.data = {};
  else if (route.startsWith('/activity-logs/') && method === 'POST') result = { success: true, sessionId: 'browser-test-session' };
  else if (route === '/todos' && method === 'POST') { const todo = { ...body, _id: id('c') }; todos.unshift(todo); result.data = todo; }
  else if (route === '/todos') result.data = todos;
  else if (route.startsWith('/todos/') && method === 'PUT') { todos[0] = { ...todos[0], ...body }; result.data = todos[0]; }
  else if (route.startsWith('/todos/') && method === 'DELETE') todos = [];
  else if (route === '/notices') result.data = emptyResources ? [] : [{ _id: id('d'), title: 'Published Flow Notice', content: 'Published announcement body', status: 'Active', targetAudience: 'Agents', category: 'Announcement', priority: 'Low', createdAt: '2028-01-01' }];
  else if (route === '/webinars') result.data = emptyResources ? [] : [{ _id: id('e'), title: 'Published Flow Webinar', speaker: university.name, date: '2028-04-01', status: 'Upcoming', description: 'Published webinar description', link: '' }];
  else if (route === '/scholarships') result.data = emptyResources ? [] : [{ _id: id('f'), title: 'Published Flow Scholarship', university: university.name, amount: 'GBP 1000', deadline: '2028-03-01', eligibility: 'Published criteria', category: 'Merit-based' }];
  const headers = [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' }];
  await client.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: headers, body: Buffer.from(JSON.stringify(result)).toString('base64') });
}

const servers = [];
let chrome;
const clients = [];
try {
  for (const [root, port, name] of [[workspace, 4175, 'admin']]) {
    const server = await createServer({ root, configLoader: 'runner', cacheDir: path.join(scratch, `vite-${name}`), server: { host: '127.0.0.1', port, strictPort: true, watch: { ignored: ['**/.audit-work/**', '**/tests/**'] } }, logLevel: 'error' });
    await server.listen(); servers.push(server);
  }
  let debuggingPortOccupied = false;
  try { debuggingPortOccupied = (await fetch('http://127.0.0.1:9228/json/version')).ok; } catch { /* Available */ }
  assert.ok(!debuggingPortOccupied, 'Test debugging port 9228 must be unused before starting Chrome');
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=9228', `--user-data-dir=${path.join(scratch, `chrome-profile-${process.pid}`)}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let browserReady = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch('http://127.0.0.1:9228/json/version')).ok) { browserReady = true; break; } } catch { /* Startup */ }
    await pause(100);
  }
  assert.ok(browserReady, 'Headless Chrome started');
  async function page(port) {
    const target = await (await fetch('http://127.0.0.1:9228/json/new?about:blank', { method: 'PUT' })).json();
    const client = new CDP(target.webSocketDebuggerUrl); clients.push(client); await client.ready;
    await client.send('Page.enable'); await client.send('Runtime.enable'); await client.send('DOM.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();' });
    client.on('Runtime.exceptionThrown', event => runtimeErrors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
    client.on('Fetch.requestPaused', event => { intercept(client, event).catch(error => runtimeErrors.push(error.message)); });
    await client.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    return client;
  }
  const admin = await page(4175);
  await admin.until("!!document.querySelector('input[type=password]')", 'admin login');
  await admin.field('Email', user.email); await admin.field('Password', 'browser-test-password');
  await admin.evaluate('document.querySelector("form").requestSubmit()');
  await admin.until("document.body.innerText.includes('Daily Report') && document.body.innerText.includes('Flow Admin')", 'dashboard');
  const results=[];
  const nav=['Daily Report','Applications','Students','Commissions','Staff Management','Staff Activity Log','Roles & Permissions','Become our Partner','University','Course','Intake','Report by Agent','Report by University','Report by Country'];
  const sizes=[[1920,1080],[1536,864],[1366,768],[1280,720],[1024,768],[820,1180],[768,1024],[390,844],[360,800]];
  const measure="(() => {const main=document.querySelector('main');return {documentOverflow:document.documentElement.scrollWidth>innerWidth+1,mainOverflow:!!main&&main.scrollWidth>main.clientWidth+1,wide:[...main?.querySelectorAll('*')||[]].filter(el=>el.getBoundingClientRect().right>innerWidth+2 && !el.closest('.overflow-x-auto')).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,50)}))}})()";
  async function audit(label){for(const [width,height] of sizes) for(const zoom of [0.8,0.9,1,1.1]){
    await admin.send('Emulation.setDeviceMetricsOverride',{width:Math.round(width/zoom),height:Math.round(height/zoom),deviceScaleFactor:zoom,mobile:false});await pause(50);
    results.push({page:label,width,height,zoom,...await admin.evaluate(measure)});
  }}
  for(const label of nav){
    if(label==='University' && !await admin.evaluate("[...document.querySelectorAll('aside button')].some(b=>b.textContent.trim()==='University')")) await admin.click('Portal Settings',true);
    if(label==='Report by Agent') await admin.click('Admin-Report',true);
    await admin.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    try { await admin.click(label,true); } catch (error) { console.log('SKIP '+label+': '+error.message); continue; }
    await pause(300);await audit(label);
  }
  await admin.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  await admin.click('Applications',true);
  await admin.evaluate('document.querySelector(\'button[aria-label="View application"]\')?.click()');
  await pause(300);await audit('Application single view');
  fs.writeFileSync(path.join(scratch,'responsive-results.json'),JSON.stringify({results,runtimeErrors},null,2));
  const overflow = results.filter(r => r.documentOverflow || r.mainOverflow);
  console.log(JSON.stringify({checks:results.length,overflow,runtimeErrors}));
  assert.equal(overflow.length, 0, 'Main content must fit the viewport; wide tables must scroll inside their container');
  assert.equal(runtimeErrors.length, 0, 'No uncaught browser errors');
} catch (error) {
  fs.writeFileSync(path.join(scratch, 'runtime-errors.json'), JSON.stringify(runtimeErrors, null, 2));
  fs.writeFileSync(path.join(scratch, 'failed-requests.json'), JSON.stringify(requests.map(({ route, method, body }) => ({ route, method, body: /login/.test(route) ? undefined : body })), null, 2));
  console.error(error.stack); process.exitCode = 1;
} finally {
  try { if (chrome) {
    const version = await (await fetch('http://127.0.0.1:9228/json/version')).json();
    const browser = new CDP(version.webSocketDebuggerUrl);
    await browser.send('Browser.close');
    browser.socket.close();
  } } catch { /* The browser may already have exited. */ }
  for (const client of clients) client.socket.close();
  if (chrome) chrome.kill();
  for (const server of servers) await server.close();
}
