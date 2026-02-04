import { db } from './server/db.ts';

const products = await db.query.monitoredProducts.findMany();
console.log('Database Products:');
products.forEach(p => {
  console.log(`- ${p.productName}: originalPrice=${p.originalPrice}, tweedeKansPrice=${p.tweedeKansPrice}`);
});
