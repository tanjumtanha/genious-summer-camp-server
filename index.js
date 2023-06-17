const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'un-valid access' });
    }
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'un-valid access' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xwzs0mx.mongodb.net/?retryWrites=true&w=majority`;

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
        //await client.connect();

        const usersCollection = client.db('musicSchool').collection('users');
        const instructorCollection = client.db('musicSchool').collection('instructors');
        const classesCollection = client.db('musicSchool').collection('classes');
        const selectedClassCollection = client.db('musicSchool').collection('selectedClass');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ token })
        })

        // verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden excess' });
            }
            next();
        }

        // verify instructor

        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden excess' });
            }
            next();
        }

        // users related data

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        // verify admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        //   verify instructor
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                return res.send({ instructor: false });
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' };
            res.send(result);
        });


        //   delete user

        app.delete('/users/:id', async (req, res) => {
            const classId = req.params.id;
            console.log(classId);

            try {
                // Find and delete the selected class by its ID
                const result = await usersCollection.deleteOne({ _id: new ObjectId(classId) });

                if (result.deletedCount === 1) {
                    res.sendStatus(200);
                } else {
                    res.sendStatus(404);
                }
            } catch (error) {
                console.error('Error deleting class:', error);
                res.sendStatus(500);
            }
        });

        app.delete('/users/:id', async (req, res) => {
            const userId = req.params.id;

            try {
                // Find the user by ID
                const user = await usersCollection.findById(userId);

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Delete the user
                await user.remove();

                res.json({ message: 'User deleted successfully', deletedCount: 1 });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        //   get all the instructor data from database
        app.get("/allInstructor", async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        });

        // get top 6 instructor
        app.get('/topInstructor', async (req, res) => {
            try {
                const topInstructors = await instructorCollection
                    .find()
                    .sort({ numberOfStudents: -1 }) // Sort in descending order
                    .limit(6) // Limit the result to 6 instructors
                    .toArray(); // Convert the MongoDB cursor to an array

                res.json(topInstructors);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        //   get all the class data from database
        app.get("/allClass", async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        });

        // post data in class field
        app.post("/allClass", verifyJWT, verifyInstructor, async (req, res) => {
            const newItem = req.body;
            newItem.status = "pending";

            const result = await classesCollection.insertOne(newItem);
            res.send(result);
        });

        app.patch('/allClass/approve/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approved'
                },
            };

            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // get top 6 class
        app.get('/topClass', async (req, res) => {
            try {
                const topClasses = await classesCollection
                    .find()
                    .sort({ enrollStudents: -1 }) // Sort in descending order
                    .limit(6) // Limit the result to 6 instructors
                    .toArray(); // Convert the MongoDB cursor to an array

                res.json(topClasses);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // selected class collection
        app.get('/selectedClass', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'No access' })
            }

            const query = { email: email };
            const result = await selectedClassCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/selectedClass', async (req, res) => {
            const item = req.body;
            console.log(item)
            const result = await selectedClassCollection.insertOne(item);
            res.send(result);
        })

        // Delete
        app.delete('/selectedClass/:classId', async (req, res) => {
            const classId = req.params.classId;
            console.log(classId);

            try {
                // Find and delete the selected class by its ID
                const result = await selectedClassCollection.deleteOne({ _id: new ObjectId(classId) });

                if (result.deletedCount === 1) {
                    res.sendStatus(200);
                } else {
                    res.sendStatus(404);
                }
            } catch (error) {
                console.error('Error deleting class:', error);
                res.sendStatus(500);
            }
        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Music school is running')
})

app.listen(port, () => {
    console.log(`Music School Server is running on port ${port}`)
})