const axios = require('axios');
axios.post('http://localhost:3000/auth/login', {
  email: 'admin@test.com',
  senha: '123456'
}).then(res => {
  console.log('SUCCESS:', res.data);
}).catch(err => {
  console.error('ERROR:', err.response ? err.response.data : err.message);
});