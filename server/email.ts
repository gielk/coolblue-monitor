import { MonitoredProduct } from "../drizzle/schema";
import { ProductData } from "./scraper";

export async function sendProductAvailabilityEmail(
  product: MonitoredProduct,
  productData: ProductData
): Promise<void> {
  // In a real implementation, you would use a service like SendGrid, Mailgun, or AWS SES
  // For now, we'll use a placeholder that logs the email
  
  const emailContent = generateEmailContent(product, productData);
  
  console.log(`[EMAIL] Sending to ${product.userEmail}`);
  console.log(`[EMAIL] Subject: ${emailContent.subject}`);
  console.log(`[EMAIL] Body: ${emailContent.body}`);
  
  // TODO: Implement actual email sending
  // You can use services like:
  // - Resend (resend.com)
  // - SendGrid
  // - Mailgun
  // - AWS SES
  
  // Example with Resend:
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'noreply@coolbluemonitor.com',
  //   to: product.userEmail,
  //   subject: emailContent.subject,
  //   html: emailContent.html,
  // });
}

interface EmailContent {
  subject: string;
  body: string;
  html: string;
}

function generateEmailContent(product: MonitoredProduct, productData: ProductData): EmailContent {
  const subject = `🎉 ${productData.name} is nu beschikbaar in Tweede Kans!`;
  
  const originalPrice = product.originalPrice ? `€${(product.originalPrice / 100).toFixed(2)}` : "N/A";
  const tweedeKansPrice = product.tweedeKansPrice ? `€${(product.tweedeKansPrice / 100).toFixed(2)}` : "N/A";
  const savings = product.originalPrice && product.tweedeKansPrice 
    ? Math.round(((product.originalPrice - product.tweedeKansPrice) / product.originalPrice) * 100)
    : 0;

  const body = `
Hallo,

Goed nieuws! Het product dat je monitort is nu beschikbaar in Tweede Kans!

Product: ${productData.name}
Normale prijs: ${originalPrice}
Tweede Kans prijs: ${tweedeKansPrice}
Besparing: ${savings}%

Bekijk het product: ${product.productUrl}

Dit is een automatische melding van Coolblue Tweede Kans Monitor.
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .product-info { background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #0066cc; }
    .price-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .price-label { font-weight: bold; }
    .savings { color: #22c55e; font-weight: bold; }
    .cta-button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Tweede Kans Product Beschikbaar!</h1>
    </div>
    <div class="content">
      <p>Hallo,</p>
      <p>Goed nieuws! Het product dat je monitort is nu beschikbaar in Tweede Kans!</p>
      
      <div class="product-info">
        <h2>${productData.name}</h2>
        <div class="price-row">
          <span class="price-label">Normale prijs:</span>
          <span>${originalPrice}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Tweede Kans prijs:</span>
          <span>${tweedeKansPrice}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Besparing:</span>
          <span class="savings">${savings}%</span>
        </div>
      </div>
      
      <a href="${product.productUrl}" class="cta-button">Bekijk Product</a>
      
      <div class="footer">
        <p>Dit is een automatische melding van Coolblue Tweede Kans Monitor.</p>
        <p>Je ontvangt deze e-mail omdat je dit product monitort.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, body, html };
}
