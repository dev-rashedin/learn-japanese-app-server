require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
      console.log('Email Sent ' + info.response);
      console.log('Message sent: %s', info.messageId);
    }
  });
};

// database connection with mongoose

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
let client;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4qgkjzt.mongodb.net/learnJapaneseDB?retryWrites=true&w=majority&appName=Cluster0`;

async function run() {
  if (!client) {
    // Create a new MongoClient if it doesn't exist
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db('learnJapaneseDB').collection('users');
    const lessonCollection = client.db('learnJapaneseDB').collection('lessons');
     const vocabularyCollection = client
       .db('learnJapaneseDB')
       .collection('vocabularies');

    // auth related api
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

    app.get('/users', verifyAdmin, async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        return res.send(error);
      }
    });

    // get specific user
    app.get('/users/:email', async (req, res) => {
      try {
        const email = req.params.email;

        const query = { email: email };

        const result = await userCollection.findOne(query);

        return res.send(result);
      } catch (error) {
        return res.send(error);
      }
    });

    // create or update user
    app.put('/users', async (req, res) => {
      0;
      const user = req.body;

      const query = { email: user.email };
      const options = { upsert: true };

      // checking if the user exists already
      const existingUser = await userCollection.findOne(query);

      try {
        if (existingUser) {
          // if existing user try to change his role
          if (user.status === 'requested') {
            const result = await userCollection.updateOne(query, {
              $set: { status: 'requested' },
            });
            return res.send(result);
          }

          // making admin
          if (user.status === 'add-admin') {
            const result = await userCollection.updateOne(query, {
              $set: {
                role: 'admin',
                status: 'verified',
              },
            });
            sendEmail(user?.email, {
              subject: 'Congratulation for Adminship',
              message:
                'You are now an admin of our LearnJapanese website. Please follow the community rules.',
            });
            return res.send(result);
          }

          // remove admin
          if (user.status === 'remove-admin') {
            const result = await userCollection.updateOne(query, {
              $set: {
                status: 'verified',
                role: 'user',
                subscription: 'usual',
              },
            });
            sendEmail(user?.email, {
              subject: 'Adminship cancelled',
              message:
                'You are now no longer an admin of our learnJapanese website. Please reach out us to know more.',
            });
            return res.send(result);
          }

          return res.send({
            message: 'User already exists',
            insertedId: null,
          });
        }

        // saving the user data for the first time

        const updateDoc = {
          $set: {
            ...user,
          },
        };
        const result = await userCollection.updateOne(
          query,
          updateDoc,
          options
        );

        // send email
        sendEmail(user?.email, {
          subject: 'Welcome to LearnJapanese',
          message: `Dear friend, your registration in LearnJapanese website is successful. Stay connected with us, hope you'll enjoy the journey.`,
        });

        res.send(result);
      } catch (error) {
        return res.send(error);
      }
    });

    // lesson related api
    app.get('/lessons', async (req, res) => {
      try {
        const result = await lessonCollection.find().toArray();
        res.send(result);
      } catch (error) {
        return res.send(error);
      }
    });

    // create lesson
    app.post('/lessons', async (req, res) => {
      try {
        const lessonData = req.body;

        const result = await lessonCollection.insertOne(lessonData);
        return res.send(result);
      } catch (error) {
        return res.send(error);
      }
    });

    // vocabulary related api
     app.get('/vocabularies', async (req, res) => {
       const page = parseInt(req.query.page) || 0;
       const size = parseInt(req.query.size) || 6;
       const status = req.query.status;
       const filter = req.query.filter;
       const search = req.query.search;
       const sort = req.query.sort;

       let query = {};

       if (search) {
         query.title = { $regex: search, $options: 'i' };
       }
       if (status) {
         query.status = status;
       }
       if (filter) {
         query.publisher = filter;
       }

       try {
         const result = await vocabularyCollection
           .aggregate([
             {
               $match: query,
             },
             {
               $addFields: {
                 posted_time_as_date: {
                   $dateFromString: {
                     dateString: '$posted_time',
                     format: '%m/%d/%Y',
                     onError: 'Invalid Date',
                     onNull: 'No Date',
                   },
                 },
               },
             },
             {
               $sort: { posted_time_as_date: sort === 'asc' ? 1 : -1 },
             },
             {
               $skip: page * size,
             },
             {
               $limit: size,
             },
           ])
           .toArray();

         res.status(200).send(result);
       } catch (error) {
         console.error('Error fetching vocabularies:', error.message);
         res.status(500).send(error.message);
       }
     });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '7d',
  });

  res.send({ token });
});

// middlewares

// verify admin middleware
const verifyAdmin = async (req, res, next) => {
  const user = req.decoded;

  const query = { email: user?.email };
  const result = await userCollection.findOne(query);

  if (!result || result?.role !== 'admin')
    return res.status(401).send({ message: 'unauthorized access!!' });

  next();
};

app.get('/', (req, res) => {
  res.send('learnjapanese server is running');
});

app.listen(port, () => {
  console.log(`learnjapanese server is running on port ${port}`);
});
