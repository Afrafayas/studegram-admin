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
  for (const [root, port, name] of [[workspace, 4175, 'admin'], [path.resolve('../studegram-portal'), 4176, 'agent']]) {
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
  await admin.until("document.body.innerText.includes('Daily Report') && document.body.innerText.includes('Flow Admin')", 'admin authenticated dashboard');
  pass('admin API login and dashboard loading');
  await admin.click('Students', true);
  await admin.until("document.body.innerText.includes('Flow Student')", 'student directory');
  await admin.evaluate(`document.querySelector('button[title="View Full Student Profile Dossier"]').click()`);
  await admin.until("document.body.innerText.includes('Passport Original.png')", 'student uploaded document');
  assert.ok(!(await admin.evaluate('document.body.innerText')).includes('Academic Higher Secondary Certificate'));
  pass('student view displays actual application upload and filename');
  await admin.click('Applications', true);
  await admin.until("document.body.innerText.includes('CAMS-ORIGINAL-7')", 'applications list after student detail');
  pass('application list navigation clears prior detail view');
  await admin.click('Create Application', true);
  await admin.until("document.body.innerText.includes('Create Student Application')", 'admin create form');
  await admin.field('Full Name', 'Entered Flow Student');
  await admin.field('Phone Number', '9876543210');
  await admin.field('Date of Birth', '2002-03-04');
  await admin.field('Student Email', 'entered-student@example.test');
  await admin.field('Passport Number', 'ENTERED456');
  await admin.selectOption('United Kingdom');
  await admin.selectOption(university.name);
  await admin.selectOption(course.title);
  await admin.selectOption(intake.title);
  await admin.upload();
  await admin.until("document.body.innerText.includes('Passport Original.png')", 'admin document upload');
  failSubmit = true;
  await admin.click('Submit Application', true);
  await admin.until("/Submission rejected for test|Request failed with status code 400/.test(document.body.innerText)", 'admin submission failure');
  assert.equal(await admin.evaluate(`document.querySelector('input[type=email]').value`), 'entered-student@example.test');
  pass('admin failed submission retains entered email, passport and form');
  failSubmit = false;
  await admin.until("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Submit Application' && !b.disabled)", 'admin retry enabled');
  await admin.click('Submit Application', true);
  await admin.until("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Create Application') && !document.body.innerText.includes('Create Student Application')", 'admin redirects to application list');
  const createdStudent = requests.filter(r => r.route === '/students' && r.method === 'POST').at(-1);
  assert.equal(createdStudent.body.email, 'entered-student@example.test');
  assert.equal(createdStudent.body.passportNo, 'ENTERED456');
  assert.equal(requests.filter(r => r.route === '/applications' && r.method === 'POST').at(-1).body.documents[0].name, 'Passport Original.png');
  pass('admin successful submission uses entered identity, upload and API intake then navigates to list');
  await admin.click('Commissions', true);
  await admin.until("document.body.innerText.includes('COM-ORIGINAL-8') && document.body.innerText.includes('900')", 'recorded admin commission');
  assert.ok(!(await admin.evaluate('document.body.innerText')).includes('Default is 10%'));
  pass('admin commissions display stored identifiers and amounts');
  await admin.click('To-do List', true);
  await admin.until("!!document.querySelector('main form input[type=text]')", 'task form');
  await admin.evaluate(`(() => {const input = document.querySelector('main form input[type=text]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Persisted Flow Task'); input.dispatchEvent(new Event('input', {bubbles: true}));})()`);
  await admin.click('Add Task', true);
  await admin.until("document.body.innerText.includes('Persisted Flow Task')", 'created task');
  await admin.evaluate(`document.querySelector('main input[type=checkbox]').click()`);
  await admin.until("!!document.querySelector('main input[type=checkbox]:checked')", 'task completion');
  await admin.click('Applications', true);
  await admin.click('To-do List', true);
  await admin.until("document.body.innerText.includes('Persisted Flow Task') && !!document.querySelector('main input[type=checkbox]:checked')", 'task retained after navigation');
  await admin.evaluate(`document.querySelector('button[title="Delete Task"]').click()`);
  await admin.until("!document.body.innerText.includes('Persisted Flow Task')", 'task removal');
  assert.ok(requests.some(r => r.route === '/todos' && r.method === 'POST'));
  assert.ok(requests.some(r => r.route.startsWith('/todos/') && r.method === 'PUT'));
  assert.ok(requests.some(r => r.route.startsWith('/todos/') && r.method === 'DELETE'));
  pass('task create, completion, navigation reload and delete use API persistence');
  const agent = await page(4176);
  await agent.until("!!document.querySelector('input[type=password]')", 'agent login');
  await agent.field('Email', partner.email); await agent.field('Password', 'browser-test-password');
  await agent.evaluate('document.querySelector("form").requestSubmit()');
  await agent.until("document.body.innerText.includes('Flow Agency') && document.body.innerText.includes('Application History')", 'agent authenticated dashboard');
  pass('agent API login and dashboard loading');
  for (const [label, expected] of [['Search Courses', course.title], ['Universities', university.name], ['Notice', 'Published Flow Notice'], ['Webinar', 'Published Flow Webinar'], ['Role & Permissions', 'Flow Agency Owner']]) {
    await agent.click(label, true);
    await agent.until(`document.body.innerText.includes(${JSON.stringify(expected)})`, `agent ${label} API data`);
    pass(`agent ${label} loads original API records`);
  }
  await agent.click('Search Courses', true); await agent.until(`document.body.innerText.includes(${JSON.stringify(course.title)})`, 'courses');
  await agent.click('Check Specs', true);
  await agent.until("document.body.innerText.includes('Published course description')", 'course specifications');
  await agent.click('Close', true); pass('course specifications open and close with original data');
  await agent.click('New Application', true);
  await agent.until("/new application details/i.test(document.body.innerText)", 'agent application modal');
  await agent.evaluate(`([...document.querySelectorAll('label')].find(l => l.textContent.includes('Existing Student')).querySelector('input')).click()`);
  await agent.selectOption(student.name);
  await agent.selectOption('United Kingdom');
  await agent.selectOption(university.name);
  await agent.selectOption(course.title);
  await agent.selectOption(intake.title);
  await agent.field('Document Name', 'Passport Original.png');
  await agent.upload();
  failSubmit = true;
  await agent.click('Submit Application', true);
  await agent.until("/Submission rejected for test|Request failed with status code 400/.test(document.body.innerText)", 'agent submission error');
  assert.ok(await agent.evaluate("/new application details/i.test(document.body.innerText)"));
  pass('agent failed submission retains modal and original document');
  failSubmit = false;
  await agent.until("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Submit Application' && !b.disabled)", 'agent retry enabled');
  await agent.click('Submit Application', true);
  await agent.until("document.body.innerText.includes('Application Submitted!')", 'agent success state');
  const agentPayload = requests.filter(r => r.route === '/applications' && r.method === 'POST').at(-1).body;
  assert.equal(agentPayload.intake, intake.title);
  assert.equal(agentPayload.documents[0].url, document.url);
  await agent.click('Close', true);
  await agent.click('Application History', true);
  await agent.until("document.body.innerText.includes('CAMS-ORIGINAL-7')", 'agent application list refresh');
  pass('agent successful submission keeps success/close flow and refreshes application history');
  emptyResources = true;
  const webinarWrites = requests.filter(r => r.route === '/webinars' && r.method === 'POST').length;
  await agent.click('Webinar', true);
  await agent.until("document.body.innerText.includes('No Webinars Found')", 'empty webinars');
  assert.equal(requests.filter(r => r.route === '/webinars' && r.method === 'POST').length, webinarWrites);
  pass('empty webinar collection stays empty and creates no sample records');
  emptyResources = false;
  assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'));
  fs.writeFileSync(path.join(scratch, 'results.json'), JSON.stringify({ passes, apiRequests: requests.map(({ route, method }) => ({ route, method })), runtimeErrors }, null, 2));
  console.log(`Browser checks passed: ${passes.length}; uncaught JavaScript errors: ${runtimeErrors.length}.`);
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
