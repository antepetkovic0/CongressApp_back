const express = require('express');
const cors = require('cors');
const dbHelp = require('../db');

const router = express.Router();
router.use(cors());

//get all speakers
router.get('/', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('speakers');
  const speakers = await collection.find({}).toArray();
  res.send({ data: speakers });
});

module.exports = router;
