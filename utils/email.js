const nodemailer = require('nodemailer');
const { htmlToText } = require('html-to-text');
const pug = require('pug');
// new Email(user,url).sendWelcome();

// Before 6th of July, it was a "regular" nodemailer handler, without any class... if we need to go back to it, just revert to a previous commit ...
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Nicolas Daudin - Natours ${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.EMAIL_SENDGRID_USERNAME,
          pass: process.env.EMAIL_SENDGRID_PASSWORD,
        },
      });
    } else {
      return nodemailer.createTransport({
        // using mailtrap => mail stays "trap" and never get sent, but it allows to check the emails, tje content... everything.
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
  }

  async send(template, subject) {
    // Render the PUG template to HTML
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        subject,
        url: this.url,
      }
    );

    // Define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: htmlToText(html),
      html,
    };

    // Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to Natours Family');
  }

  async sendResetPassword() {
    await this.send(
      'resetpassword',
      'Your password reset token (valid for 10 min)'
    );
  }
};
