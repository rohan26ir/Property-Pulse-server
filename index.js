const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 8000;

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

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Verify Token Middleware
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

// Function to connect to MongoDB and set up routes
async function run() {
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB!');

    const userCollection = client.db('PropertyPulse').collection('users');
    const apartmentsCollection = client.db('PropertyPulse').collection('apartments');
    const agreementsCollection = client.db('PropertyPulse').collection('agreements');
    const announceCollection = client.db('PropertyPulse').collection('announcements');

    // JWT API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      try {
        const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '5h' });
        res.send({ token });
      } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).send({ message: 'Failed to generate token' });
      }
    });

    // Users API
    app.post('/users', async (req, res) => {
      const user = req.body;

      try {
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }

        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error('Error inserting user:', error);
        res.status(500).send({ message: 'Failed to insert user' });
      }
    });

    // Get all users
    app.get('/users', verifyToken, async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ message: 'Failed to fetch users' });
      }
    });

    // Get user by email
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })








    // Apartments API (with pagination and filters)
    app.get('/apartment', async (req, res) => {
      const { page = 1, limit = 6, min, max } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      try {
        const query = {};
        if (min && max) {
          query.rent = { $gte: parseInt(min), $lte: parseInt(max) };
        }

        const total = await apartmentsCollection.countDocuments(query);
        const apartments = await apartmentsCollection.find(query).skip(skip).limit(parseInt(limit)).toArray();

        res.send({ apartments, total });
      } catch (error) {
        console.error('Error fetching apartments:', error);
        res.status(500).send({ message: 'Failed to fetch apartments' });
      }
    });

    // Agreements API
    app.post('/agreements', async (req, res) => {
      const agreementData = req.body;

      try {
        const existingAgreement = await agreementsCollection.findOne({
          userId: agreementData.userId,
          apartmentId: agreementData.apartmentId,
        });

        if (existingAgreement) {
          return res.status(400).send({ message: 'You already have an agreement for this apartment.' });
        }

        const result = await agreementsCollection.insertOne(agreementData);
        res.send({ insertedId: result.insertedId });
      } catch (error) {
        console.error('Error inserting agreement:', error);
        res.status(500).send({ message: 'Failed to insert agreement' });
      }
    });

    // Get agreements for a user
    app.get('/agreements', verifyToken, async (req, res) => {
      const { email } = req.decoded; // Extract email from decoded token

      try {
        const userAgreements = await agreementsCollection.find({ userEmail: email }).toArray();
        res.send(userAgreements);
      } catch (error) {
        console.error('Error fetching agreements:', error);
        res.status(500).send({ message: 'Failed to fetch agreements' });
      }
    });

    app.delete('/agreements/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const result = await agreementsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error('Error deleting agreement:', error);
        res.status(500).send({ message: 'Failed to delete agreement' });
      }
    });


    // Announcements API
    app.get('/announcements', async (req, res) => {
      try {
        const result = await announceCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch announcements" });
      }
    });









    app.get('/', (req, res) => {
      res.send('PropertyPulse is running...');
    });
  } catch (err) {
    console.error('Error in run():', err);
  }
}

run().catch(console.dir);

// Start the server
app.listen(port, () => console.log(`PropertyPulse running on port ${port}`));
