const mongoClient = require('mongodb').MongoClient;

let db;

const connectDB = callback => {
  mongoClient.connect(
    'mongodb://localhost:27017',
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
