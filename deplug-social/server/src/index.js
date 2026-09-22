import 'dotenv/config';
import dns from 'node:dns';
import { app } from './app.js';
import { seedDevelopmentUsers } from './db.js';

// Some development networks advertise IPv6 without providing a usable route.
// Prefer IPv4 for external payment-provider requests in that situation.
dns.setDefaultResultOrder('ipv4first');

const port = Number(process.env.PORT || 3001);

await seedDevelopmentUsers();
const server = app.listen(port, '127.0.0.1', () => console.log(`Deplug Social API listening on http://127.0.0.1:${port}`));
server.on('error', (error) => {
  console.error(`Unable to start the API on port ${port}: ${error.message}`);
  process.exitCode = 1;
});
