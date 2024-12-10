require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


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



// database connection with mongoose

mongoose
  .connect(`${process.env.MONGODB_URI}`)
  .then(() => console.log('connection established'))
  .catch((err) => console.error(err));



app.get('/', (req, res) => {
  res.send('learnjapanese server is running');
});

app.listen(port, () => {
  console.log(`learnjapanese server is running on port ${port}`);
});