const express = require('express');
const cors = require('cors');
const dbHelp = require('../db');
const router = express.Router();
router.use(cors());

//get lectures - plenary/not plenary with their speaker
router.get('/', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('lectures');

  const plenaryL = await collection
    .aggregate([
      { $match: { plenary: 'da' } },
      {
        $lookup: {
          from: 'speakers',
          localField: 'speakerId',
          foreignField: 'id',
          as: 'speaker'
        }
      }
    ])
    .toArray();

  const notPlenaryL = await collection
    .aggregate([
      { $match: { plenary: 'ne' } },
      {
        $lookup: {
          from: 'speakers',
          localField: 'speakerId',
          foreignField: 'id',
          as: 'speaker'
        }
      }
    ])
    .toArray();

  res.send({
    data: [
      { title: 'Plenary lectures', data: plenaryL },
      { title: 'Invited lectures', data: notPlenaryL }
    ]
  });
});

//get lectures by day
router.get('/:day', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('lectures');

  const day = req.params.day;
  //const lectures = await collection.find({ date: `${day}` }).toArray();

  const lectures = await collection
    .aggregate([
      { $match: { date: `${day}` } },
      {
        $lookup: {
          from: 'speakers',
          localField: 'speakerId',
          foreignField: 'id',
          as: 'speaker'
        }
      }
    ])
    .toArray();
  res.json(lectures);
});

module.exports = router;
