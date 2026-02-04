import { drizzle } from "drizzle-orm/mysql2";
import { monitoredProducts } from "./drizzle/schema";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "coolblue_monitor",
});

const db = drizzle(connection);
const products = await db.select().from(monitoredProducts);

console.log("Database Products:");
products.forEach((p: any) => {
  console.log(
    `- ${p.productName}: originalPrice=${p.originalPrice}, tweedeKansPrice=${p.tweedeKansPrice}`
  );
});

await connection.end();
