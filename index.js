const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 8000;
const app = express();
const cookieParser = require('cookie-parser');

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://propertys-pulse.web.app/',
    'https://propertys-pulse.firebaseapp.com/',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  optionalSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8c67l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Function to connect to MongoDB and set up routes
async function run() {
  try {
    // Connect the client to the server (persistent connection)
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    const userCollection = client.db("PropertyPulse").collection("users");

    // JWT-related API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '3h' });
      res.send({ token });
    });

    // Verify Token Middleware
    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;
      if (!token) return res.status(401).send({ message: 'Unauthorized access' });

      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized access' });
        }
        req.user = decoded;
        next();
      });
    };

    // Users API
    app.post('/users', async (req, res) => {
      const user = req.body;

      // Check if the user already exists
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }

      // Insert the new user into the database
      const result = await userCollection.insertOne(user);
      res.send(result);
    });


    app.get('/', (req, res) => {
      res.send('PropertyPulse is running....');
    });
  } catch (err) {
    console.error("Error in run():", err);
  }
}

run().catch(console.dir);

// Start the server
app.listen(port, () => console.log(`PropertyPulse running on port ${port}`));
