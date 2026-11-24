
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function testEmail() {
  console.log("Testing email with:");
  console.log("User:", process.env.EMAIL_USER);
  console.log("Pass:", process.env.EMAIL_PASSWORD ? "****" : "MISSING");

  try {
    await transporter.verify();
    console.log("Transporter is ready to take messages");
    
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Test Email",
      text: "If you see this, email is working!",
    });
    
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

testEmail();
