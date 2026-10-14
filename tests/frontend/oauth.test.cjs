const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../frontend/js/app.js'), 'utf8');
const token = 'T'.repeat(43), previous = 'P'.repeat(43), nonce = 'N'.repeat(43);

// Execute the real boot loader and observe the identity sent on its first API request.
function boot({ page = 'login', state = nonce, pending = { value: nonce, createdAt: Date.now() }, storage, sessions } = {}) {
  const values = storage || new Map([['kbch.v1.token', previous]]);
  const sessionValues = sessions || new Map(pending ? [['kbch.oauth.state', JSON.stringify(pending)]] : []);
  const wrap = map => ({ getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) });
  const requests = [];
  const context = {
    KBCH_API_URL: 'https://api.example.test/api',
    URLSearchParams, Date,
    location: { hash: '#token=' + token + (state ? '&login_state=' + state : '') },
    localStorage: wrap(values), sessionStorage: wrap(sessionValues),
    setTimeout() {},
    fetch(url, options) { requests.push({ url, headers: options.headers }); return new Promise(() => {}); },
    document: {
      documentElement: { lang: 'ru', getAttribute: () => '../', classList: { add() {}, remove() {} } },
      currentScript: { getAttribute: () => page },
      addEventListener() {},
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild(el) { if (el.src && /\/env\.js\?/.test(el.src)) el.onload(); } }
    }
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'app.js' });
  return { values, sessionValues, requests, accepted: context.App.oauthReturn };
}

for (const [name, options] of [
  ['token on a catalog page', { page: 'catalog' }],
  ['unsolicited login link', { pending: null }],
  ['missing return nonce', { state: '' }],
  ['different tab nonce', { state: 'X'.repeat(43) }],
  ['expired login', { pending: { value: nonce, createdAt: Date.now() - 601000 } }],
  ['future timestamp', { pending: { value: nonce, createdAt: Date.now() + 60000 } }]
]) {
  test(`OAuth rejects ${name} without replacing the current account`, () => {
    const result = boot(options);
    assert.equal(result.values.get('kbch.v1.token'), previous);
    assert.equal(result.requests[0].headers.Authorization, 'Bearer ' + previous);
    assert.equal(result.accepted, false);
  });
}

test('OAuth accepts a recent response in its initiating login tab exactly once', () => {
  const first = boot();
  assert.equal(first.requests[0].headers.Authorization, 'Bearer ' + token);
  assert.equal(first.accepted, true);
  assert.equal(first.sessionValues.has('kbch.oauth.state'), false);
  first.values.set('kbch.v1.token', previous);
  const replay = boot({ storage: first.values, sessions: first.sessionValues });
  assert.equal(replay.requests[0].headers.Authorization, 'Bearer ' + previous);
  assert.equal(replay.accepted, false);
});
