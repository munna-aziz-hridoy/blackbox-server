import { io } from 'socket.io-client';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } = naclUtil;

const base = 'http://localhost:5055';

const register = async (email, publicKey) => {
  const res = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, publicKey }),
  });
  const { devCode } = await res.json();
  return devCode;
};

const verify = async (email, code) => {
  const res = await fetch(`${base}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const { identityKey } = await res.json();
  return identityKey;
};

const search = async (email, identityKey) => {
  const res = await fetch(`${base}/search?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${identityKey}` },
  });
  return res.ok ? res.json() : null;
};

const connect = (identityKey) =>
  io(base, { auth: { identityKey }, transports: ['websocket'] });

const userId = (identityKey) =>
  JSON.parse(Buffer.from(identityKey.split('.')[0], 'base64url').toString()).userId;

const pairA = nacl.box.keyPair();
const pairB = nacl.box.keyPair();

const keyA = await verify('a@example.com', await register('a@example.com', encodeBase64(pairA.publicKey)));
const keyB = await verify('b@example.com', await register('b@example.com', encodeBase64(pairB.publicKey)));
const idB = userId(keyB);

let passed = 0;
const total = 4;

const found = await search('b@example.com', keyA);
if (found && found.userId === idB && found.publicKey === encodeBase64(pairB.publicKey)) {
  console.log('search found B:', found.email, '| online:', found.online);
  passed++;
}

const a = connect(keyA);
const b = connect(keyB);

b.on('message', (msg) => {
  const serverSawCiphertextOnly = msg.body === undefined && typeof msg.box === 'string';
  const plaintext = encodeUTF8(
    nacl.box.open(
      decodeBase64(msg.box),
      decodeBase64(msg.nonce),
      decodeBase64(msg.fromPublicKey),
      pairB.secretKey,
    ),
  );
  console.log('B decrypted:', plaintext, '| id:', msg.id, '| server saw ciphertext only:', serverSawCiphertextOnly);
  if (plaintext === 'hello B' && msg.from === userId(keyA) && serverSawCiphertextOnly) passed++;
  finish();
});

await new Promise((r) => setTimeout(r, 500));

const nonce = nacl.randomBytes(nacl.box.nonceLength);
const box = nacl.box(decodeUTF8('hello B'), nonce, pairB.publicKey, pairA.secretKey);
const sealed = { id: 'demo-msg-1', nonce: encodeBase64(nonce), box: encodeBase64(box) };

a.emit('message', { to: idB, ...sealed }, (ack) => {
  console.log('online ack:', JSON.stringify(ack));
  if (ack?.delivered === true) passed++;
});

a.emit('message', { to: 'nobody-offline', ...sealed }, (ack) => {
  console.log('offline ack:', JSON.stringify(ack));
  if (ack?.delivered === false) passed++;
});

let done = false;
function finish() {
  if (done) return;
  done = true;
  setTimeout(() => {
    const ok = passed === total;
    console.log(
      ok
        ? 'PASS: register/verify + search + E2E delivery + delivered/undelivered acks work'
        : `FAIL (passed=${passed}/${total})`,
    );
    a.close();
    b.close();
    process.exit(ok ? 0 : 1);
  }, 300);
}

setTimeout(() => {
  console.log(`FAIL: timeout (passed=${passed}/${total})`);
  process.exit(1);
}, 5000);
