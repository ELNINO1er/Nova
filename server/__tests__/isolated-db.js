// Garde-fou des tests MySQL : ils créent et suppriment des données. Ils ne tournent que sur une base
// dont le nom se termine par « _test » (ex. nova_test), jamais sur la base de développement ou de production.
//   DB_NAME=nova_test SEED_DEMO=true npm test
import 'dotenv/config';

const name = process.env.DB_NAME || 'nova';
if (!/_test$/.test(name)) {
  throw new Error(`Tests MySQL refusés sur la base « ${name} » : utilisez une base isolée dont le nom finit par _test (DB_NAME=nova_test).`);
}
