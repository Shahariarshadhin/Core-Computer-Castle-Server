const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');



const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.axj0p.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        await client.connect();
        console.log('Database connected');
        const partsCollection = client.db('core_computer_castle').collection('parts');
        const buyingCollection = client.db('core_computer_castle').collection('buying');


        app.get('/part', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        })

        app.post('/buying', async (req, res) => {
            const buying = req.body;
            const result = await buyingCollection.insertOne(buying);
            res.send(result);
        })

        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await partsCollection.findOne(query);
            res.send(part);
        })


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