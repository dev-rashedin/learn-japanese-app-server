require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const nodemailer = require('nodemailer');


// middleware
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://learjapaneese.web.app',
  ],
  // credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionSuccessStatus: 200,
};


app.use(cors(corsOptions));
app.use(express.json());

// send email
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
}


// models
const User = require('./models/User');


// database connection with mongoose

mongoose
  .connect(`${process.env.MONGODB_URI}`)
  .then(() => console.log('connection established'))
  .catch((err) => console.error(err));

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d',
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }

      const token = req.headers.authorization.split(' ')[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          console.log('JWT verification error:', err);
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      const user = req.decoded;

      const query = { email: user?.email };
      const result = await userCollection.findOne(query);

      if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access!!' });

      next();
};
    


app.put('/users', async (req, res) => {
  const user = req.body;
  console.log(user)

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


app.get('/', (req, res) => {
  res.send('learnjapanese server is running');
});

app.listen(port, () => {
  console.log(`learnjapanese server is running on port ${port}`);
});