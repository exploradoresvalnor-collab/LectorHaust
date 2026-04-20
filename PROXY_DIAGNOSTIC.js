/**
 * PROXY_DIAGNOSTIC.js
 * 
 * Ejecuta este script en la consola de DevTools para diagnosticar problemas de proxy
 * 
 * Uso: 
 * 1. Abre DevTools (F12)
 * 2. Copia TODO este script
 * 3. Pégalo en la Console y presiona Enter
 * 4. Espera los resultados
 */

const PROXY_TESTS = {
  '/api-md/manga': 'MangaDex',
  '/api-anilist': 'AniList',
  '/uploads-md/covers': 'MangaDex Uploads',
  '/api-aniwatch': 'AniWatch',
  '/api-comick': 'Comick'
};

const TEST_RESULTS = {};

console.log('%c🔍 INICIANDO DIAGNÓSTICO DE PROXIES...', 'color: blue; font-size: 14px; font-weight: bold');
console.log('Esto probará la conectividad de cada proxy\n');

async function testProxy(path, name) {
  const startTime = Date.now();
  
  try {
    console.log(`⏳ Probando ${name} (${path})...`);
    
    // Simple fetch para verificar que el proxy responde
    const response = await fetch(path, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    
    const duration = Date.now() - startTime;
    const status = response.status;
    
    if (status === 200 || status === 206) {
      console.log(`✅ ${name}: HTTP ${status} en ${duration}ms`);
      TEST_RESULTS[name] = 'OK';
    } else if (status === 404) {
      console.log(`⚠️ ${name}: HTTP 404 (Proxy respondió pero ruta inválida) en ${duration}ms`);
      TEST_RESULTS[name] = '404_INVALID_ROUTE';
    } else if (status >= 500) {
      console.log(`❌ ${name}: HTTP ${status} (Server Error) en ${duration}ms`);
      TEST_RESULTS[name] = `ERROR_${status}`;
    } else {
      console.log(`⚠️ ${name}: HTTP ${status} en ${duration}ms`);
      TEST_RESULTS[name] = `HTTP_${status}`;
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    const isNetworkError = err.message?.includes('Failed to fetch');
    
    if (isTimeout) {
      console.log(`❌ ${name}: TIMEOUT después de 5s`);
      TEST_RESULTS[name] = 'TIMEOUT';
    } else if (isNetworkError) {
      console.log(`❌ ${name}: ERROR DE RED (Proxy no responde)`);
      TEST_RESULTS[name] = 'NETWORK_ERROR';
    } else {
      console.log(`❌ ${name}: ${err.message}`);
      TEST_RESULTS[name] = `ERROR: ${err.message}`;
    }
  }
  
  // Delay antes del siguiente test para no saturar
  await new Promise(r => setTimeout(r, 500));
}

async function runDiagnostics() {
  // Test cada proxy
  for (const [path, name] of Object.entries(PROXY_TESTS)) {
    await testProxy(path, name);
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('%c📊 RESUMEN DE RESULTADOS', 'color: blue; font-size: 14px; font-weight: bold');
  console.log('='.repeat(60));
  
  let allGood = true;
  for (const [name, result] of Object.entries(TEST_RESULTS)) {
    const icon = result === 'OK' ? '✅' : (result.includes('TIMEOUT') ? '⏱️' : '❌');
    console.log(`${icon} ${name}: ${result}`);
    if (result !== 'OK') allGood = false;
  }
  
  console.log('='.repeat(60));
  
  if (allGood) {
    console.log('%c✅ TODOS LOS PROXIES FUNCIONANDO CORRECTAMENTE', 'color: green; font-size: 12px; font-weight: bold');
  } else {
    console.log('%c⚠️ ALGUNOS PROXIES TIENEN PROBLEMAS. VER ARRIBA.', 'color: red; font-size: 12px; font-weight: bold');
  }
  
  // Información de debugging adicional
  console.log('\n' + '='.repeat(60));
  console.log('%c🔧 INFORMACIÓN DEL ENTORNO', 'color: purple; font-size: 12px; font-weight: bold');
  console.log('='.repeat(60));
  console.log(`URL: ${window.location.href}`);
  console.log(`Host: ${window.location.hostname}`);
  console.log(`Port: ${window.location.port}`);
  console.log(`User-Agent: ${navigator.userAgent.substring(0, 80)}...`);
}

// Ejecutar diagnóstico
runDiagnostics().catch(err => {
  console.error('❌ Error ejecutando diagnóstico:', err);
});
