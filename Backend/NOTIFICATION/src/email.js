require('dotenv').config();
const nodemailer = require('nodemailer');

const useAppPassword = Boolean(process.env.EMAIL_PASS);

const authConfig = useAppPassword
  ? {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  : {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    };

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: authConfig,
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error(
      `Error connecting to email server (${useAppPassword ? 'app-password' : 'oauth2'}):`,
      error
    );
  } else {
    console.log(
      `Email server is ready to send messages (${useAppPassword ? 'app-password' : 'oauth2'})`
    );
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Your Name" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;