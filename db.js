const mongoClient = require('mongodb').MongoClient;

const url = process.env.MONGO_URI || 'mongodb://localhost:27017';

let db;

const connectDB = callback => {
  mongoClient.connect(
    url,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, client) => {
      db = client.db('conference');
      console.log('Connected to DB');
      callback(err);
    }
  );
};

const getDB = () => {
  return db;
};

const disconnectDB = () => {
  db.close();
};

module.exports = { connectDB, getDB, disconnectDB };
