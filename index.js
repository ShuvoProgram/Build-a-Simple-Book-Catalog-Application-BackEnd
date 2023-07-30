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

        app.get('/book/:id', async (req, res) => {
            const id = req.params.id;
            const result = await booksCollection.findOne({ _id: new ObjectId(id) })
            res.send({ status: true, data: result })
        })

        app.delete('/book/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                {
                    return res.status(400).json({ error: 'Invalid ID format' });
                }
            }

            const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Book not found' })
            }
            res.send({ status: true, data: result });
        })

        app.post('/comment/:id', async (req, res) => {
            const bookId = req.params.id;
            const comment = req.body.comment;

            console.log(bookId);
            console.log(comment);

            const result = await booksCollection.updateOne(
                { _id: new ObjectId(bookId) },
                { $push: { comments: comment } }
            )
            if (result.modifiedCount !== 1) {
                console.error('Book not found or comment not added');
                res.json({ error: 'Book not found or comment not added' });
                return;
            }
            res.json({ message: 'Comment added successfully' });
        })

        app.get('/comment/:id', async (req, res) => {
            const bookId = req.params.id;

            const result = await booksCollection.findOne(
                { _id: new ObjectId(bookId) },
                { projection: { _id: 0, comments: 1 } }
            );

            if (result) {
                res.json(result);
            } else {
                res.status(404).json({ error: 'Product not found' });
            }
        });

        app.post('/user', async (req, res) => {
            const user = req.body;

            const result = await booksCollection.insertOne(user);

            res.send(result);
        });

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;

            const result = await booksCollection.findOne({ email });

            if (result?.email) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });

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