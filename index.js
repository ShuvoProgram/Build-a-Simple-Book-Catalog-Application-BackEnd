require('dotenv').config();
const express = require('express');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
// const { nanoid } = require('nanoid');
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
        const readingCollection = client.db('books_catalog').collection('reading')
        const readingFinishedCollection = client.db('books_catalog').collection('readingFinished')

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
            const cursor = await booksCollection.find({}).sort({ _id: -1 }).toArray();
            res.send({ data: cursor });
        })

        app.get('/recent-books', async (req, res) => {
            const recentBooks = await booksCollection.find({})
                .sort({ _id: -1 })
                .limit(10)
                .toArray();

            res.send({ data: recentBooks });
        });


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

        app.delete(
            "/book/:id/:postId",
            async (req, res) => {
                try {
                    const { id, postId } = req.params;

                    const bookQuery = { _id: new ObjectId(id) };
                    const book = await booksCollection.findOne(bookQuery);

                    if (!book) {
                        res.send({
                            success: false,
                            error: "Book not found",
                        });
                        return;
                    }

                    // Check if the book exists in the wishlist collection
                    const wishlistQuery = { _id: new ObjectId(postId) };
                    const wishlistBook = await whishlistCollection.findOne(wishlistQuery);

                    let deletedFromWishlist = true;
                    if (wishlistBook) {
                        const deleteWishlistResult = await whishlistCollection.deleteOne(wishlistQuery);
                        if (!deleteWishlistResult.acknowledged || deleteWishlistResult.deletedCount !== 1) {
                            deletedFromWishlist = false;
                        }
                    }

                    const deleteBookResult = await booksCollection.deleteOne(bookQuery);
                    if (deleteBookResult.acknowledged && deleteBookResult.deletedCount === 1) {
                        res.send({
                            success: true,
                            message: "Book Deleted Successfully",
                            deletedFromWishlist: deletedFromWishlist,
                        });
                    } else {
                        res.send({
                            success: false,
                            error: "Book Delete Failed",
                        });
                    }
                } catch (error) {
                    res.send({
                        success: false,
                        error: error.message,
                    });
                }
            }
        );


        app.post('/comment/:id', async (req, res) => {
            const bookId = req.params.id;
            const comment = req.body.comment;

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

        app.post('/users/add', async (req, res) => {
            try {
                const { email, password } = req.body;
                // Check if user already exists
                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: 'User already exists' });
                }
                // Hash the password using bcrypt
                const hashedPassword = await bcrypt.hash(password, 10);
                // Create a new user document
                const newUser = {
                    email: email,
                    password: hashedPassword, // In a real scenario, you should hash the password
                };
                const result = await usersCollection.insertOne(newUser);
                // Generate a JWT token
                const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY); // Replace 'secret-key' with your secret key

                // Construct the response with the token
                const response = {
                    _id: result.insertedId,
                    email: newUser.email,
                    token: token,
                };

                res.json({ message: 'User registered successfully', response });

            } catch (error) {
                console.error('Error during registration:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        // API endpoint to get user by ID
        app.get('/users/:id', async (req, res) => {
            const userId = req.params.id;
            // Find the user in the collection by ID
            const result = await usersCollection.findOne({ _id: new ObjectId(userId) });
            if (result) {
                res.json(result);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        });

        // Search API endpoint
        app.get('/book', async (req, res) => {
            const searchTerm = req.query.search;
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
                res.status(500).json({ error: 'An error occurred while fetching books' });
            }
        });


        // app.get('/books/category/:category', async (req, res) => {
        //     const searchTerm = req.query.search || '';
        //     const categoryFilter = req.params.category || '';

        //     const searchRegex = new RegExp(searchTerm, 'i');

        //     const query = {
        //         $or: [
        //             { title: searchRegex },
        //             { author: searchRegex },
        //             { genre: searchRegex },
        //         ],
        //         genre: new RegExp(categoryFilter, 'i'),
        //     };

        //     const result = await booksCollection.find(query).toArray();
        //     res.send(result);

        // })

        app.post('/wishlist', async (req, res) => {
            try {
                const wishlist = req.body;
                const wishlistId = {
                    postId: wishlist.postId || '',
                    user: wishlist.user || '',
                    title: wishlist.title || '',
                    image: wishlist.image || '',
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
            // Log the user email from the query parameter
            // Fetch wishlist items for the specified user
            const email = req.query.user;
            const query = { user: email };
            const userWishlist = await whishlistCollection.find(query).toArray();
            res.send(userWishlist);
        });

        app.delete('/wishlist/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await whishlistCollection.deleteOne(query);
            res.send(result);
        })

        app.post('/reading-list', async (req, res) => {
            try {
                const readingList = req.body;
                const readingId = {
                    postId: readingList.postId || '',
                    user: readingList.user || '',
                    title: readingList.title || '',
                    image: readingList.image || '',
                    author: readingList.author || '',
                    genre: readingList.genre || '',
                    publicationDate: readingList.publicationDate || ''
                }
                const alreadyreadingList = await readingCollection.find(readingId).toArray();
                if (alreadyreadingList.length) {
                    const message = `You have already reading List`
                    return res.send({ acknowledged: false, message })
                }
                const result = await readingCollection.insertOne(readingList);
                res.send(result);
            } catch (error) {
                res.send({
                    success: false,
                    error: error.message
                })
            }
        })

        app.get('/reading-list', async (req, res) => {
            // Log the user email from the query parameter
            // Fetch wishlist items for the specified user
            const email = req.query.user;
            const query = { user: email };
            const userReading = await readingCollection.find(query).toArray();
            res.send(userReading);
        });

        app.delete('/reading-list/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await readingCollection.deleteOne(query);
            res.send(result);
        })

        app.post('/reading-finished/:postId', async (req, res) => {
            try {
                const { postId } = req.params;

                if (!postId) {
                    return res.status(400).json({ message: 'Book ID is required.' });
                }
                const existingBook = await readingCollection.findOne({ postId: postId })
                if (!existingBook) {
                    return res.status(404).json({ message: 'Book not found.' });
                }
                // Move the book to readingFinishedCollection
                const readingFinished = await readingFinishedCollection.insertOne(existingBook);
                if (readingFinished.insertedId) {
                    const deleteReadBook = await readingCollection.deleteOne({ postId: postId });

                    if (deleteReadBook.deletedCount) {
                        return res.status(200).json({
                            message: 'Book finished and moved to readingFinishedCollection'
                        });
                    }
                }

                return res.status(500).json({ message: 'Failed to move the book.' });

            } catch (error) {
                
                res.status(500).json({ message: 'Internal server error.' });
            }
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