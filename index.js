const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const userName = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// middleware***
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
// make middleware***
// const logger = async(req, res, next) =>{
//   console.log('called', req.body, req.originalUrl);
//   next();
// } 
// const verifyToken = async(req, res, next) =>{
//   const token = req.cookies?.token;
//   if(!token){
//     return res.status(401).send({message: "not authorized"})
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
//     if(err){
//       console.log(err);
//       return res.status(401).send({message: "unauthorized"});
//     }
//     req.user = decoded;
//     console.log("user is valid", decoded);
//     next();
//   })
// }

const verifyToken = (req, res, next) =>{
  // console.log('log info', req.method, req.url);
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'unauthorized'});
    }
    req.user = decoded;
    next();
  })
  // console.log('verify token', token);
  // next();
}


const uri = `mongodb+srv://${userName}:${password}@cluster0.wnyje.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');

    // auth operation***
    // 1...***
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true});
    })
    app.post('/logout', async(req, res) =>{
      const user = req.body;
      // console.log('loging out', user);
      res.clearCookie('token', { maxAge: 0 }).send({success: true})
    })

    // 2..***
    // app.post('/jwt', async(req, res) =>{
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign( user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3h'})
    //   res
    //   .cookie('token', token, {
    //     httpOnly: true, 
    //     secure: false
    //   })
    //   .send({success: true});
    // })

    // bookings operation***
    app.patch('/bookings/:id', async(req, res) =>{
      const id = req.params.id;
      const updatedBooking = req.body;
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        }
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.delete('/bookings/:id', async(req, res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })
    app.post('/bookings', async(req, res) =>{
        const order = req.body;
        const result = await bookingCollection.insertOne(order);
        res.send(result);
    })
    app.get('/bookings', verifyToken, async(req, res) =>{
        // if(req.query.email !== req.user.email){
        //   return res.status(403).send({message: "forbidden"});
        // }
        // console.log("cook cookies", req.cookies);
        // console.log('token owner info', req.query);
        if(req.user.email !== req.query.email){
          return res.status(403).send({message: 'forbidden'})
        }
        let query = {};
        if(req.query?.email){
            query = {email: req.query.email};
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
    })

    //services operation***
    app.get('/services', async(req, res) =>{
        const services = serviceCollection.find();
        const result = await services.toArray();
        res.send(result);
    })
    app.get('/services/:id', async(req, res) =>{
        const id = req.params.id;
        const query = { _id: new ObjectId(id)};
        const result = await serviceCollection.findOne(query);
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// extra***
app.get('/', (req, res) =>{
    res.send("Car doctor server is running");
})
app.listen(port, () =>{
    console.log(`Car Doctor server is running on Port ${port}`)
})