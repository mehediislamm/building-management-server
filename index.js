const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware 
//


app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjauaf8.mongodb.net/?retryWrites=true&w=majority`;


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
        // Send a ping to confirm a successful connection
        const dataCollection = client.db('managementDb').collection('data');
        const CartDataCollection = client.db('managementDb').collection('carts');



        //jwt related api


        // cartDataCollection 

        app.post('/carts', async (req, res) => {
            const cartData = req.body;
            const result = await CartDataCollection.insertOne(cartData);
            res.send(result);
        });

        //pagination 
        app.get('/data', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            console.log('pagination quary', page, size);
            const result = await dataCollection.find()
            .skip(page * size)
            .limit(size)
            .toArray();
            res.send(result);
        })

        app.get('/DataCount', async (req, res) => {
            const count = await dataCollection.estimatedDocumentCount();
            res.send({ count })
        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('building management is running')
});

app.listen(port, () => {
    console.log(`building is running on port ${port}`);
});