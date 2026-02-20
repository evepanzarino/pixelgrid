const bcrypt = require('bcryptjs');

// Generate hash for: TrueLove25320664!
const password = 'TrueLove25320664!';
const hash = bcrypt.hashSync(password, 10);

console.log('Password hash for TrueLove25320664!:');
console.log(hash);

// Verify it works
const isValid = bcrypt.compareSync(password, hash);
console.log('Verification:', isValid ? 'SUCCESS' : 'FAILED');
