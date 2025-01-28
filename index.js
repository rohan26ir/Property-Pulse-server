const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 8000;

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://propertys-pulse.web.app/',
    'https://propertys-pulse.firebaseapp.com/',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
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
    const couponCollection = client.db('PropertyPulse').collection('coupons');

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
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    



//     app.get("/users", async (req, res) => {
//   const { email } = req.query;
  
//   try {
//     const user = await userCollection.findOne({ email });
//     if (user) {
//       res.json({ exists: true });
//     } else {
//       res.json({ exists: false });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// Route to get all users
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


    // Get admin role of a user
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ admin: user?.role === 'admin' });
    });



    // Update user role to member
    app.patch('/users/member/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role: 'member' } }
        );
        res.send({ success: true, result });
      } catch (error) {
        console.error('Error updating user role to member:', error);
        res.status(500).send({ message: 'Failed to update role to member' });
      }
    });

    // Check if a user is a member
    app.get('/users/member/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      res.send({ member: user?.role === 'member' });
    });

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
        const apartments = await apartmentsCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();
        res.send({ apartments, total });
      } catch (error) {
        console.error('Error fetching apartments:', error);
        res.status(500).send({ message: 'Failed to fetch apartments' });
      }
    });

    // Get apartment by ID
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



    // Announcements API
    app.post('/announcements', async (req, res) => {
      const { title, description } = req.body;

      if (!title || !description) {
        return res.status(400).send({ message: "Title and description are required." });
      }

      try {
        const newAnnouncement = { title, description, createdAt: new Date() };
        const result = await announceCollection.insertOne(newAnnouncement);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error("Error creating announcement:", error);
        res.status(500).send({ message: "Failed to create announcement." });
      }
    });


    // Get all announcements
    app.get('/announcements', async (req, res) => {
      try {
        const announcements = await announceCollection.find().sort({ createdAt: -1 }).toArray();
        res.send(announcements);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).send({ message: "Failed to fetch announcements." });
      }
    });


    // Agreements API
    app.get('/agreements', async (req, res) => {
      try {
        const agreements = await agreementsCollection.find().toArray();
        res.send(agreements);
      } catch (error) {
        console.error('Error fetching agreements:', error);
        res.status(500).send({ message: 'Failed to fetch agreements.' });
      }
    });

    // Update agreement status to accepted
    app.patch('/agreements/status/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await agreementsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'accepted' } }
        );
        if (result.modifiedCount > 0) {
          res.send({ message: 'Agreement status updated to accepted.' });
        } else {
          res.status(404).send({ message: 'Agreement not found.' });
        }
      } catch (error) {
        res.status(500).send({ message: 'Failed to update agreement status.' });
      }
    });

    // Delete an agreement
    app.delete('/agreements/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await agreementsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.send({ message: 'Agreement deleted successfully.' });
        } else {
          res.status(404).send({ message: 'Agreement not found.' });
        }
      } catch (error) {
        res.status(500).send({ message: 'Failed to delete agreement.' });
      }
    });

   // Get agreements by user ID
    app.get('/agreements/:userId', async (req, res) => {
      const { userId } = req.params;
      try {
        const userAgreements = await agreementsCollection.find({ userId }).toArray();
        res.send(userAgreements);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch user agreements.' });
      }
    });
    


    
    // Add a new coupon
    app.post('/coupons', async (req, res) => {
      const { couponCode, discount, description } = req.body;
      
      if (!couponCode || discount == null || !description) {
        return res.status(400).send({ message: 'All fields are required.' });
      }

      try {
        const newCoupon = { couponCode, discount, description, createdAt: new Date() };
        const result = await couponCollection.insertOne(newCoupon);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).send({ message: 'Failed to add coupon.' });
      }
    });

    
    // Get all coupons
    app.get('/coupons', async (req, res) => {
      try {
        const coupons = await couponCollection.find().toArray();
        res.send(coupons);
      } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).send({ message: 'Failed to fetch coupons.' });
      }
    });







    // payment intent
    app.post('/payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    // get all payments
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    // add payment
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    })






    app.get('/', (req, res) => {
      res.send('PropertyPulse is running...');
    });
  } catch (err) {
    console.error('Error in run():', err);
  }
}

run().catch(console.dir);

app.listen(port, () => console.log(`PropertyPulse running on port ${port}`));