const nodemailer = require('nodemailer');
require('dotenv').config();

async function main() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: 'Test Email',
    text: 'This is a test email from Node.js',
  });

  console.log('Test email sent!');
}

main().catch(console.error);
