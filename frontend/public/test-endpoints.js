// Script para probar endpoints desde el navegador (F12 Console)
console.log('🧪 Probando endpoints de pagos desde el navegador...');

// 1. Probar endpoint de debug (sin autenticación)
fetch('http://localhost:5000/api/pagos/debug')
  .then(response => {
    console.log('📡 GET /api/pagos/debug:', response.status, response.statusText);
    return response.json();
  })
  .then(data => {
    console.log('✅ Debug response:', data);
  })
  .catch(error => {
    console.error('❌ Error en debug:', error);
  });

// 2. Probar endpoint de test (sin autenticación)
fetch('http://localhost:5000/api/pagos/test')
  .then(response => {
    console.log('📡 GET /api/pagos/test:', response.status, response.statusText);
    return response.json();
  })
  .then(data => {
    console.log('✅ Test response:', data);
  })
  .catch(error => {
    console.error('❌ Error en test:', error);
  });

// 3. Verificar autenticación
const token = localStorage.getItem('access_token');
console.log('🔑 Token JWT:', token ? 'Presente' : 'No presente');

if (token) {
  // Probar endpoint con autenticación
  fetch('http://localhost:5000/api/pagos/test-auth', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    console.log('📡 GET /api/pagos/test-auth:', response.status, response.statusText);
    return response.json();
  })
  .then(data => {
    console.log('✅ Auth response:', data);
  })
  .catch(error => {
    console.error('❌ Error en auth:', error);
  });
}

console.log('🏁 Pruebas desde navegador completadas');
