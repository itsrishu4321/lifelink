/* Vercel serverless entry — handles every /api/** request via vercel.json rewrites.
   Re-exports the shared handler from server.js (zero-dependency, no framework). */
module.exports = require('../server.js');
