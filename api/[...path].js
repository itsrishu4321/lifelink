/* Vercel serverless entry — handles every /api/** request.
   Re-exports the shared handler from server.js (zero-dependency, no framework). */
module.exports = require('../server.js');
