const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

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

        const instructorCollection = client.db('musicSchool').collection('instructors');
        const classesCollection = client.db('musicSchool').collection('classes');
        const selectedClassCollection = client.db('musicSchool').collection('selectedClass');

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

        app.post('/selectedClass', async (req, res) => {
            const item = req.body;
            console.log(item)
            const result = await selectedClassCollection.insertOne(item);
            res.send(result);
          })




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