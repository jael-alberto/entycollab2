#!/usr/bin/env node
// scripts/verify-staging.mjs
// Comprueba que el staging (Vercel -> Render -> Supabase) está bien conectado.
//
// Uso:
//   node scripts/verify-staging.mjs https://entycollab-backend-staging.onrender.com \
//     https://entycollab-staging.vercel.app
//
// Comprueba:
//   1. GET /health del backend responde 200.
//   2. El preflight CORS del backend acepta el origen del frontend.
//   3. El bundle del frontend apunta al host del backend (VITE_API_URL aplicado).

const [, , backendArg, frontendArg] = process.argv;

if (!backendArg || !frontendArg) {
  console.error('Uso: node scripts/verify-staging.mjs <backendUrl> <frontendUrl>');
  console.error('Ej:  node scripts/verify-staging.mjs https://entycollab-backend-staging.onrender.com https://entycollab-staging.vercel.app');
  process.exit(2);
}

const backend = backendArg.trim().replace(/\/+$/, '');
const frontend = frontendArg.trim().replace(/\/+$/, '');
const backendHost = new URL(backend).host;

const TIMEOUT_MS = 90_000; // Render free puede tardar ~50 s en despertar.
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function main() {
  // 1. Salud del backend
  try {
    const res = await request(`${backend}/health`);
    const body = await res.text();
    record(
      'Backend /health',
      res.ok,
      `${res.status} ${body.slice(0, 120).replace(/\s+/g, ' ')}`
    );
  } catch (error) {
    record('Backend /health', false, error.message);
  }

  // 2. CORS: preflight desde el origen del frontend
  try {
    const res = await request(`${backend}/api/bootstrap`, {
      method: 'OPTIONS',
      headers: {
        Origin: frontend,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization'
      }
    });
    const allowed = res.headers.get('access-control-allow-origin');
    const ok = (res.ok || res.status === 204) && (allowed === frontend || allowed === '*');
    record(
      'CORS preflight',
      ok,
      `status=${res.status} allow-origin=${allowed ?? '(ninguno)'}`
    );
  } catch (error) {
    record('CORS preflight', false, error.message);
  }

  // 3. El bundle del frontend debe contener el host del backend
  try {
    const htmlRes = await request(frontend);
    const html = await htmlRes.text();
    if (!htmlRes.ok) throw new Error(`HTML ${htmlRes.status}`);

    const scriptMatch = html.match(/src="([^"]+\.js)"/);
    if (!scriptMatch) throw new Error('no se encontró el bundle JS en el HTML');

    const scriptUrl = new URL(scriptMatch[1], frontend).toString();
    const bundleRes = await request(scriptUrl);
    const bundle = await bundleRes.text();
    if (!bundleRes.ok) throw new Error(`bundle ${bundleRes.status}`);

    const pointsToBackend = bundle.includes(backendHost);
    const pointsToLocalhost = /localhost:3001|127\.0\.0\.1:3001/.test(bundle);

    record(
      'Bundle apunta al backend',
      pointsToBackend && !pointsToLocalhost,
      `host=${backendHost} encontrado=${pointsToBackend} localhost=${pointsToLocalhost}`
    );
  } catch (error) {
    record('Bundle apunta al backend', false, error.message);
  }

  const failed = results.filter(r => !r.ok);
  console.log(
    `\n${failed.length === 0 ? 'Staging OK' : `Staging con ${failed.length} fallo(s)`} ` +
    `(${results.length - failed.length}/${results.length})`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
