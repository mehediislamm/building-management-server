const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        const userCollection = client.db('managementDb').collection('users');
        const dataCollection = client.db('managementDb').collection('data');
        const CartDataCollection = client.db('managementDb').collection('carts');
        const AdminAnnouncementCollection = client.db('managementDb').collection('announcement');
        const paymentCollection = client.db('managementDb').collection('payments');


        // admin announcement 
        app.post("/announcement", async (req, res) => {
            const user = req.body;
            //   console.log(user);
            const result = await AdminAnnouncementCollection.insertOne(user);
            console.log(result);
            res.send(result);
        });

        app.get("/announcement", async (req, res) => {
            const result = await AdminAnnouncementCollection.find().toArray();
            res.send(result);
        });



        //jwt related api 

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })

        //middleWare
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }


        //use verify admin after verifyToken

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const quary = { email: email };
            const user = await userCollection.findOne(quary);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }




        //users related api 
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const quary = { email: email };
            const user = await userCollection.findOne(quary);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';

            }


            res.send({ admin });
        });



        app.get('/users/member/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const quary = { email: email };
            const user = await userCollection.findOne(quary);
            let member = false;


            if (user) {
                member = user?.role === 'member';

            }

            res.send({ member });
        });


        app.patch('/users/admin/:id', verifyAdmin, verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'member'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })







        app.get('/carts/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const quary = { email: email };
            const user = await CartDataCollection.findOne(quary);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });



        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(quary);
            res.send(result);
        })


        //jwt related api


        // cartDataCollection 

        app.post('/carts', async (req, res) => {
            const cartData = req.body;
            const result = await CartDataCollection.insertOne(cartData);
            res.send(result);
        });
        //my profile user dashboard 

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const quary = { email: email };
            const result = await CartDataCollection.find(quary).toArray();
            res.send(result);
        });

        app.patch('/carts/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await CartDataCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })


        app.delete('/carts/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) }
            const result = await CartDataCollection.deleteOne(quary);
            res.send(result);
        })



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


        // payment intent 

        app.post('/create-payment-intent', async (req, res) => {
            const { rent } = req.body;
            const amount = parseInt(rent * 100);
            console.log(amount, ' amount inside the intent');

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        app.get('/payments/:email', verifyToken, async (req, res) => {
            const quary = { email: req.params.email }
            if (req.params.email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const result = await paymentCollection.find(quary).toArray()
            res.send(result)
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);
            console.log('payment info', payment);

            const quary = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            };

            const deleteResult = await CartDataCollection.deleteMany(quary);


            res.send({ paymentResult, deleteResult });

        })


        //status or analvtics

        app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
            const users = await userCollection.estimatedDocumentCount();
            const orders = await paymentCollection.estimatedDocumentCount();
            res.send({
                users,
                orders
            })
        })


        // useing aggregate pipeline 
        app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
            const result = await paymentCollection.aggregate([
                {
                    $unwind: '$cartIds'
                },
                {
                    $lookup: {
                        from: 'data',
                        localField: 'dataIds',
                        foreignField: '_id',
                        as: 'datas'
                    }
                },
                {
                    $unwind: '$dataIds'
                },
                {
                    $group: {
                        _id: '$dataIds.apartment_no',
                        quantity: { $sum: 1 },
                         
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: '$_id',
                        quantity: '$quantity',
                       
                    }
                }
            ]).toArray();

            res.send(result);

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