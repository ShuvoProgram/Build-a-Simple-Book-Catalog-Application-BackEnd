require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

const cors = require('cors');

app.use(cors());
app.use(express.json());

const uri = `${process.env.DB_Uri}`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

const run = async () => {
    try {
        const booksCollection = client.db('books_catalog').collection('books');

        app.post('/book', async (req, res) => {
            const book = req.body;
            const result = await booksCollection.insertOne(book);

            res.send(result);
        })

        app.get('/books', async (req, res) => {
            const cursor = await booksCollection.find({}).toArray();
            res.send({ status: true, data: cursor });
        })

    } catch (error) {
        console.log(error)
    }
}

run().catch((err) => console.error(err))

app.get('/', (req, res) => {
    res.send('Books Server Successfully Started!')
})


app.listen(port, () => {
    console.log(`Listen on ${port}`)
})