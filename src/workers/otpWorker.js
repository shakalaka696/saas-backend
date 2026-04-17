const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load your Mailtrap credentials

const transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});

const worker = new Worker('otp-queue', async (job) => {
  const { email, firstName, code } = job.data;
  
  console.log(`📨 Processing OTP for: ${email}`);

  await transport.sendMail({
    from: '"Support" <no-reply@yourapp.com>',
    to: email,
    subject: "Your Verification Code",
    text: `Hi ${firstName}, your 6-digit code is: ${code}. It expires in 10 minutes.`
  });

  console.log(`✅ Email sent successfully to ${email}`);
}, {
  connection: { host: '127.0.0.1', port: 6379 }
});

console.log("🚀 OTP Worker is active and listening...");