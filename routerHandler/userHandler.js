const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');


const sendEmail = (emailAddress, emailData) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.TRANSPORTER_Email,
      pass: process.env.TRANSPORTER_PASS,
    },
  });

  // verify connection configuration
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log('Server is ready to take our messages');
    }
  });

  const mailBody = {
    from: `"Learn Japanese" <${process.env.TRANSPORTER_EMAIL}>`, // sender address
    to: emailAddress, // list of receivers
    subject: emailData.subject, // Subject line
    html: emailData.message, // html body
  };

  const info = transporter.sendMail(mailBody, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      // console.log('Email Sent ' + info.response);
      //  console.log('Message sent: %s', info.messageId);
    }
  });
};


router.put('/', async (req, res) => {
  const user = req.body;
  console.log(user);

  const query = { email: user.email };
  const options = { upsert: true };

  try {
    // Check if the user already exists
    const existingUser = await User.findOne(query);

    if (existingUser) {
      // Update existing user based on conditions
      if (user.status === 'requested') {
        const result = await User.updateOne(query, {
          $set: { status: 'requested' },
        });
        return res.send(result);
      }

      if (user.role === 'admin') {
        const result = await User.updateOne(query, {
          $set: {
            role: 'admin',
            status: 'verified',
            subscription: 'premium',
          },
        });

        sendEmail(user.email, {
          subject: 'Congratulation for Adminship',
          message:
            'You are now an admin of our Learn Japanese website. Please follow the community rules.',
        });

        return res.send(result);
      }

      if (user.status === 'remove-admin') {
        const result = await User.updateOne(query, {
          $set: {
            status: 'verified',
            role: 'user',
            subscription: 'usual',
          },
        });

        sendEmail(user.email, {
          subject: 'Adminship cancelled',
          message:
            'You are now no longer an admin of our Learn Japanese website. Please reach out to us to know more.',
        });

        return res.send(result);
      }

      return res.status(400).send({
        message: 'User already exists',
        insertedId: null,
      });
    }

    // Save new user data for the first time
    const newUser = new User({
      ...user,
    });

    const result = await newUser.save();

    // Send welcome email
    sendEmail(user.email, {
      subject: 'Welcome to LearnJapanese',
      message: `Dear friend, your registration in Learn Japanese website is successful. Stay connected with us, hope you'll enjoy the journey.`,
    });

    res.send(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ error: error.message });
  }
});


module.exports = router;