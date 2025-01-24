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
    const apartmentsCollection = client.db("PropertyPulse").collection("apartments");
    const agreementsCollection = client.db("PropertyPulse").collection("agreements");




    // JWT-related API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '5h' });
      res.send({ token });
    })
    

    // Verify Token Middleware
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }
    

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


    // // apartments related apis
    // app.get('/apartment', async (req, res) => {
    //   const result = await apartmentsCollection.find().toArray();
    //   res.send(result);
    // });

    // app.get('/apartment/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await apartmentsCollection.findOne(query);
    //   res.send(result);
    // })

    // 

    app.get('/apartment', async (req, res) => {
      const { page = 1, limit = 6, min, max } = req.query;
      const skip = (page - 1) * limit;
    
      const query = {};
      if (min && max) {
        query.rent = { $gte: parseInt(min), $lte: parseInt(max) };
      }
    
      const total = await apartmentsCollection.countDocuments(query);
      const apartments = await apartmentsCollection
        .find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();
    
      res.send({ apartments, total });
    });


    app.post('/agreements', async (req, res) => {
  const agreementData = req.body;

  try {
    // Check if the user already has an agreement for this apartment
    const existingAgreement = await agreementsCollection.findOne({
      userId: agreementData.userId,
      apartmentId: agreementData.apartmentId,
    });

    if (existingAgreement) {
      return res.status(400).send({
        message: "You already have an agreement for this apartment.",
      });
    }

    // If no existing agreement, insert the new agreement
    const result = await agreementsCollection.insertOne(agreementData);
    res.send({ insertedId: result.insertedId });
  } catch (error) {
    console.error("Error inserting agreement:", error);
    res.status(500).send({ message: "Failed to insert agreement" });
  }
});

// Get agreements by userId
app.get('/agreements', verifyToken, async (req, res) => {
  const userId = req.user?._id; // Extract user ID from decoded token
  if (!userId) {
    return res.status(400).send({ message: 'Invalid token - User ID missing' });
  }

  try {
    const userAgreements = await agreementsCollection.find({ userId }).toArray();
    res.send(userAgreements);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    res.status(500).send({ message: 'Failed to fetch agreements' });
  }
});

app.delete('/agreements/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await agreementsCollection.deleteOne(query);
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
