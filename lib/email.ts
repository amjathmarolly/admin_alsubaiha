import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("[Email] Missing EMAIL_USER or EMAIL_PASSWORD environment variables");
      throw new Error("Email service not configured");
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: `"Al Subaiha" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    throw error;
  }
}

export function generateVerificationEmail(
  customerName: string,
  customerEmail: string,
  verificationLink: string,
  defaultPassword: string
) {
  return {
    subject: "Welcome to Al Subaiha - Verify Your Email",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
            .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .credentials { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Al Subaiha!</h1>
            </div>
            <div class="content">
              <p>Hello ${customerName},</p>
              <p>Thank you for joining Al Subaiha! Your account has been created successfully.</p>
              
              <p><strong>Please verify your email address by clicking the button below:</strong></p>
              <a href="${verificationLink}" class="button">Verify Email Address</a>
              
              <p style="margin-top: 20px;">Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: white; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">${verificationLink}</p>
              
              <div class="credentials">
                <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                <p><strong>Email:</strong> <code style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${customerEmail}</code></p>
                <p><strong>Default Password:</strong> <code style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${defaultPassword}</code></p>
                <p style="margin-bottom: 0; font-size: 12px; color: #666;"><em>Please change your password after your first login for security.</em></p>
              </div>
              
              <p style="margin-top: 20px; color: #666;">This verification link will expire in 24 hours.</p>
              
              <div class="footer">
                <p>Al Subaiha | Furniture & Home Decor</p>
                <p>If you did not create this account, please ignore this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Al Subaiha!

Thank you for joining Al Subaiha! Your account has been created successfully.

Please verify your email address by visiting this link:
${verificationLink}

Your Login Credentials:
Email: ${customerEmail}
Default Password: ${defaultPassword}

Please change your password after your first login for security.

This verification link will expire in 24 hours.

---
Al Subaiha | Furniture & Home Decor
If you did not create this account, please ignore this email.
    `.trim(),
  };
}

export function generateVerificationSuccessEmail(customerName: string) {
  return {
    subject: "Email Verified - Welcome to Al Subaiha",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
            .success-message { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verified Successfully!</h1>
            </div>
            <div class="content">
              <p>Hello ${customerName},</p>
              
              <div class="success-message">
                <strong>Your email has been verified!</strong> Your account is now fully activated.
              </div>
              
              <p>You can now log in with your credentials and start browsing our collection of premium furniture and home decor.</p>
              
              <p style="margin-top: 30px;">Thank you for choosing Al Subaiha!</p>
              
              <div class="footer">
                <p>Al Subaiha | Furniture & Home Decor</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Email Verified Successfully!

Hello ${customerName},

Your email has been verified! Your account is now fully activated.

You can now log in with your credentials and start browsing our collection of premium furniture and home decor.

Thank you for choosing Al Subaiha!

---
Al Subaiha | Furniture & Home Decor
    `.trim(),
  };
}
