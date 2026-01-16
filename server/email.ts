import nodemailer from "nodemailer";
import { MonitoredProduct } from "../drizzle/schema";
import { ProductData } from "./scraper";

interface EmailConfig {
  gmailEmail: string;
  gmailAppPassword: string;
}

let emailConfig: EmailConfig | null = null;

export function setEmailConfig(config: EmailConfig) {
  emailConfig = config;
  console.log(`[Email] Gmail config set for ${config.gmailEmail}`);
}

export function getEmailConfig(): EmailConfig | null {
  return emailConfig;
}

async function getTransporter() {
  if (!emailConfig) {
    throw new Error("Email config not set. Please configure Gmail credentials.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailConfig.gmailEmail,
      pass: emailConfig.gmailAppPassword,
    },
  });
}

export async function sendProductAvailabilityEmail(
  product: MonitoredProduct,
  productData: ProductData
): Promise<boolean> {
  try {
    if (!emailConfig) {
      console.warn("[Email] Email config not configured. Skipping email send.");
      return false;
    }

    const transporter = await getTransporter();

    // Format prices
    const originalPriceStr = product.originalPrice
      ? `€${(product.originalPrice / 100).toFixed(2)}`
      : "N/A";
    const tweedeKansPriceStr = product.tweedeKansPrice
      ? `€${(product.tweedeKansPrice / 100).toFixed(2)}`
      : "N/A";

    // Calculate savings
    let savingsStr = "";
    let savingsPercent = 0;
    if (product.originalPrice && product.tweedeKansPrice) {
      const savings = product.originalPrice - product.tweedeKansPrice;
      savingsPercent = Math.round((savings / product.originalPrice) * 100);
      savingsStr = `<p style="color: #10b981; font-weight: bold; font-size: 18px;">💰 Je bespaart: €${(savings / 100).toFixed(2)} (${savingsPercent}%)</p>`;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .product-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0066ff; }
    .price-section { display: flex; justify-content: space-between; margin: 15px 0; }
    .price-item { flex: 1; }
    .price-label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; }
    .price-value { font-size: 20px; font-weight: bold; color: #0066ff; }
    .original-price { color: #999; text-decoration: line-through; }
    .button { display: inline-block; background: #0066ff; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
    .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Tweede Kans Beschikbaar!</h1>
      <p>Je gezochte product is nu beschikbaar</p>
    </div>
    
    <div class="content">
      <p>Hallo,</p>
      
      <p>Goed nieuws! Het product dat je monitorde is nu beschikbaar als Tweede Kans:</p>
      
      <div class="product-info">
        <div class="badge">TWEEDE KANS BESCHIKBAAR</div>
        <h2 style="margin: 10px 0; color: #1f2937;">${productData.name}</h2>
        
        <div class="price-section">
          <div class="price-item">
            <div class="price-label">Adviesprijs</div>
            <div class="price-value original-price">${originalPriceStr}</div>
          </div>
          <div class="price-item">
            <div class="price-label">Tweede Kans Prijs</div>
            <div class="price-value">${tweedeKansPriceStr}</div>
          </div>
        </div>
        
        ${savingsStr}
        
        <a href="${product.productUrl}" class="button">Bekijk Product →</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Deze notificatie is verzonden omdat je dit product monitorde met Coolblue Monitor.
      </p>
    </div>
    
    <div class="footer">
      <p>Coolblue Monitor - Automatische Tweede Kans Detector</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Tweede Kans Beschikbaar!

${productData.name}

Adviesprijs: ${originalPriceStr}
Tweede Kans Prijs: ${tweedeKansPriceStr}
Besparing: ${savingsPercent}%

Bekijk het product: ${product.productUrl}

Deze notificatie is verzonden omdat je dit product monitorde met Coolblue Monitor.
    `;

    const info = await transporter.sendMail({
      from: emailConfig.gmailEmail,
      to: product.userEmail,
      subject: `🎉 ${productData.name} - Tweede Kans Beschikbaar!`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`[Email] Successfully sent to ${product.userEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

export async function testEmailConnection(
  gmailEmail: string,
  gmailAppPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail,
        pass: gmailAppPassword,
      },
    });

    await transporter.verify();
    return {
      success: true,
      message: "Email connection successful! Gmail credentials are valid.",
    };
  } catch (error) {
    console.error("[Email] Connection test failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
