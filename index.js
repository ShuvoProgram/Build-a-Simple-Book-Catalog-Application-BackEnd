require('dotenv').config();
const express = require('express');
const jwt = require("jsonwebtoken");
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

//Verify User
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send("unauthorized access");
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
    });
}

const generateAuthToken = (user) => {
    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const token = jwt.sign(
        { _id: user._id, name: user.name, email: user.email },
        jwtSecretKey
    );

    return token;
};

const run = async () => {
    try {
        const booksCollection = client.db('books_catalog').collection('books');
        const usersCollection = client.db('books_catalog').collection('users');
        const whishlistCollection = client.db('books_catalog').collection('whishlist')

        app.get('/token', async (req, res) => {
            const email = req.query.email;
            if (!email || !email.includes("@")) {
                res.status(400).send({
                    message: "Email is required",
                    success: false,
                });
                return;
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign(
                    { email: user.email },
                    process.env.ACCESS_TOKEN,
                    {
                        expiresIn: "7d",
                    }
                );
                return res.send({
                    success: true,
                    token: token,
                });
            }
            res.status(403).send({ token: "" });
        })

        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const result = await usersCollection.insertOne(user);
                if (result.acknowledged) {
                    res.send({
                        success: true,
                        message: `Successfully register the user`,
                    });
                } else {
                    res.send({
                        success: false,
                        message: `Failed to register the user`,
                    });
                }
            } catch (error) {
                res.send({
                    success: false,
                    message: error.message,
                });
            }
        })

        app.post('/book', async (req, res) => {
            const book = req.body;
            const result = await booksCollection.insertOne(book);

            res.send(result);
        })

        app.get('/books', async (req, res) => {
            const cursor = await booksCollection.find({}).toArray();
            res.send({ data: cursor });
        })

        app.get('/book/:id', async (req, res) => {
            const id = req.params.id;
            const result = await booksCollection.findOne({ _id: new ObjectId(id) })
            res.send({ status: true, data: result })
        })

        app.patch('/book/:id', async (req, res) => {
            const { id } = req.params;
            const { title, author, genre } = req.body;
            const filter = { _id: new ObjectId(id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    title, author, genre
                }
            }
            try {
                const result = await booksCollection.updateOne(filter, updateDoc, option)
                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: 'Book not found' });
                }
                res.send({ data: result, id: id });
            } catch (error) {
                res.status(500).json({ error: 'An error occurred while updating the book' });
            }
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
        // Search API endpoint
        app.get('/books', async (req, res) => {
            const searchTerm = req.query.search;
            console.log(searchTerm)
            const query = {
                $or: [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { author: { $regex: searchTerm, $options: 'i' } },
                    { genre: { $regex: searchTerm, $options: 'i' } },
                ]
            }
            try {
                // Search for books matching the title, author, or genre
                const results = await booksCollection.find(query).toArray();
                res.send(results);
            } catch (error) {
                console.error('Error fetching books:', error);
                res.status(500).json({ error: 'An error occurred while fetching books' });
            }
        });

        app.get('/books/category/:category', async (req, res) => {
            const searchTerm = req.query.search || '';
            const categoryFilter = req.params.category || '';

            const searchRegex = new RegExp(searchTerm, 'i');

            const query = {
                $or: [
                    { title: searchRegex },
                    { author: searchRegex },
                    { genre: searchRegex },
                ],
                genre: new RegExp(categoryFilter, 'i'),
            };

            const result = await booksCollection.find(query).toArray();
            res.send(result);

        })

        app.post('/wishlist', async (req, res) => {
            try {
                const wishlist = req.body;
                const wishlistId = {
                    postId: wishlist.postId || '',
                    user: wishlist.user || '',
                    title: wishlist.title || '',
                    author: wishlist.author || '',
                    genre: wishlist.genre || '',
                    publicationDate: wishlist.publicationDate || ''
                }
                const alreadyWishlist = await whishlistCollection.find(wishlistId).toArray();
                if (alreadyWishlist.length) {
                    const message = `You have already wishlist`
                    return res.send({ acknowledged: false, message })
                }
                const result = await whishlistCollection.insertOne(wishlist);
                res.send(result);
            } catch (error) {
                res.send({
                    success: false,
                    error: error.message
                })
            }
        })

        app.get('/wishlist', async (req, res) => {
            console.log(req.query.user); // Log the user email from the query parameter
            // Fetch wishlist items for the specified user
            const email = req.query.user;
            const query = { user: email };
            const userWishlist = await whishlistCollection.find(query).toArray();

            res.send(userWishlist);
        });

        //test
        app.get('/wishlist', async (req, res) => {
            const cursor = await whishlistCollection.find({}).toArray();
            res.send({ data: cursor });
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