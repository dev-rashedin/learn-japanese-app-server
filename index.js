require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
// const nodemailer = require('nodemailer');
const userHandler = require('./routerHandler/userHandler');


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



// models
// const User = require('./models/User');


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
    
// route handlers
app.use('/users', userHandler)




app.get('/', (req, res) => {
  res.send('learnjapanese server is running');
});

app.listen(port, () => {
  console.log(`learnjapanese server is running on port ${port}`);
});


