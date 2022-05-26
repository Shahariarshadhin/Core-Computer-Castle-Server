const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');
const stripe = require('stripe')(process.env.STRIPE_SCERET_KEY);


const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.axj0p.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


/////// --------verify jwt token--------////////////

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;

        next();
    })
}

async function run() {

    try {
        await client.connect();
        console.log('Database connected');
        const partsCollection = client.db('core_computer_castle').collection('parts');
        const buyingCollection = client.db('core_computer_castle').collection('buying');
        const userCollection = client.db('core_computer_castle').collection('users');
        const paymentCollection = client.db('core_computer_castle').collection('payments');
        const reviewCollection = client.db('core_computer_castle').collection('reviews');

        //---------------show data from databse to ui--------------

        app.get('/part', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        })

        //----------------send buyer info to database---------------

        app.post('/buying', async (req, res) => {
            const buying = req.body;
            const result = await buyingCollection.insertOne(buying);
            res.send(result);
        })


        //------------show user order to mu orders page--------


        app.get('/buying', verifyJWT, async (req, res) => {
            const buyer = req.query.buyer;
            const decodedEmail = req.decoded.email;
            if (buyer === decodedEmail) {
                const query = { buyer: buyer };
                const buying = await buyingCollection.find(query).toArray();
                res.send(buying);

            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

        })



        //---------------show single items in a single page------------

        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await partsCollection.findOne(query);
            res.send(part);
        })

        //---------------update qunatity from database------------------

        app.put('/part/:id', async (req, res) => {
            console.log(req.body);
            const id = req.params.id;
            const updatedProduct = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedInfo = {
                $set: {
                    quantity: updatedProduct.updatedQuentity
                }
            }
            const result = await partsCollection.updateOne(filter, updatedInfo, options);
            res.send(result);
        })

        // ------------get user data in database-------------//

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,

            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
            res.send({ result, token });

        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        // --------------MAke Admin------------------//

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {

                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);

            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })

            }

        })


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });


        })


        app.get('/buying/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const buying = await buyingCollection.findOne(query);
            res.send(buying);
        })

        //----payment intent----------//

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        //------Payment-----------//

        app.patch('/buying/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedBuying = await buyingCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
        })

        //add review to database
        app.post('/review', async (req, res) => {
            const newreview = req.body;
            const result = await reviewCollection.insertOne(newreview);
            res.send(result);
        })

        //add review to ui
        app.get('/review', async (req, res) => {

            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        })

        //add product to database by admin

        app.post('/part', async (req, res) => {
            const newParts = req.body;
            const result = await partsCollection.insertOne(newParts);
            res.send(result);
        })





    }


    finally {

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Core Computer Castle Running Freely')
})

app.listen(port, () => {
    console.log(`Core Computer Castle app listening on port ${port}`)
})