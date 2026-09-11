const baseUrl = process.env.DEPLOYMENT_URL;

if (!baseUrl) {
  console.error('DEPLOYMENT_URL is required');
  process.exit(2);
}

const routes = ['/', '/products', '/sleep-app'];
const attempts = Number(process.env.VERIFY_ATTEMPTS || 6);
const timeoutMs = Number(process.env.VERIFY_TIMEOUT_MS || 10000);
const delayMs = Number(process.env.VERIFY_DELAY_MS || 5000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'asclepios-deployment-verifier/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyRoute(route) {
  const url = new URL(route, baseUrl).toString();
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      const body = await response.text();
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!contentType.includes('text/html')) {
        throw new Error(`unexpected content-type: ${contentType || 'missing'}`);
      }
      if (!body.trim()) {
        throw new Error('empty HTML response');
      }

      console.log(`PASS ${url} -> ${response.status}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/${attempts} failed for ${url}: ${error.message}`);
      if (attempt < attempts) await sleep(delayMs);
    }
  }

  throw new Error(`Deployment verification failed for ${url}: ${lastError?.message || 'unknown error'}`);
}

try {
  for (const route of routes) {
    await verifyRoute(route);
  }
  console.log(`Deployment verification passed for ${baseUrl}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
