const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbHelp = require('../db');

const router = express.Router();
const secret = process.env.SECRET_KEY || 'secret';
router.use(cors());

router.get('/', (req, res) => {
  res.send('USERS...');
});

//TODO make db schema validation (if theres not collection make it)
router.post('/register', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('users');

  const userData = {
    email: req.body.email,
    username: req.body.username,
    password: req.body.password
  };

  await collection
    .find({ email: `${req.body.email}` })
    .toArray()
    .then(user => {
      if (!user[0]) {
        //db returning [{user1},{user2},...] - if user is null -> doesnt exist
        //hash password (pref async)
        (async () => {
          await collection
            .find({ username: `${req.body.username}` })
            .toArray()
            .then(name => {
              if (!name[0]) {
                (async () => {
                  const hash = await bcrypt.hash(req.body.password, 10);
                  userData.password = hash;

                  //insert user into db
                  await collection.insertOne(userData);
                  res.send({ status: 'Successful registered.' });
                })();
              } else {
                res.send({ status: 'Enter unique username.' });
              }
            });
        })();
      } else {
        res.send({ status: 'User already exists!' });
      }
    })
    .catch(err => {
      res.send({ dbError: err });
    });
});

router.post('/login', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('users');

  await collection
    .find({ username: `${req.body.username}` })
    .toArray()
    .then(user => {
      if (user[0]) {
        //user exists
        (() => {
          //compareSync returning true/false
          const match = bcrypt.compareSync(req.body.password, user[0].password);
          if (match) {
            const payload = {
              id: user[0]._id,
              username: user[0].username,
              email: user[0].email
            };

            const token = jwt.sign(payload, secret, {
              expiresIn: '1h'
            });
            res.send({ token });
          } else {
            res.send({ status: 'Invalid password!' });
          }
        })();
      } else {
        res.send({ status: 'User doesnt exist!' });
      }
    })
    .catch(err => {
      res.send({ dbError: err });
    });
});

//middleware function
function checkToken(req, res, next) {
  const header = req.headers['authorization'];

  if (typeof header !== 'undefined') {
    //if theres token
    const bearer = header.split(' ');
    const token = bearer[1];

    //verify token
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.send({ status: 'Failed to authenticate token.' });
      } else {
        //save to request for use
        //req.decoded = decoded;
        req.decoded = decoded;
        next();
      }
    });
  } else {
    res.send({ status: 'No provided token.' });
  }
}

router.get('/profile', checkToken, async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('users');

  //req.decoded.exp = datetime of expiration token
  await collection
    .find({ username: `${req.decoded.username}` })
    .toArray()
    .then(user => {
      if (user[0]) {
        res.send({ user: user[0] });
      } else {
        res.send('User doesnt exist.');
      }
    })
    .catch(err => {
      res.send({ dbError: err });
    });
});

router.get('/timeline/:email', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('users');

  const mail = req.params.email;
  try {
    const lecturesTimeline = await collection
      .aggregate([
        { $match: { email: mail } },
        {
          $lookup: {
            from: 'lectures',
            localField: 'lecturesIds',
            foreignField: 'id',
            as: 'timelineLectures'
          }
        }
      ])
      .toArray();

    const lecs = lecturesTimeline[0].timelineLectures;
    const allowed = [
      'id',
      'fromTime',
      //'toTime',
      //'classroom',
      'title',
      'description'
    ];
    const arr = lecs.map(lec => {
      let date = lec.date;
      let duration = parseInt(lec.toTime) - parseInt(lec.fromTime);
      const filtered = Object.keys(lec)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
          if (key === 'fromTime') {
            obj['time'] = lec[key];
          } else if (key === 'title') {
            obj[key] = date + ' - ' + lec[key];
          } else if (key === 'description') {
            obj[key] = 'Duration: ' + duration + 'h\n' + lec[key];
          } else {
            obj[key] = lec[key];
          }
          return obj;
        }, {});
      return filtered;
    });
    res.json(arr);
  } catch (err) {
    res.send(err);
  }
});

router.get('/:mail/:lecId', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('users');

  const email = req.params.mail;
  const lectureId = req.params.lecId;

  let r = await collection.updateOne(
    { email: email },
    { $addToSet: { lecturesIds: Number(lectureId) } }
  );
  res.json(r.result);
  //{n: 1, nModified: 0/1 => 0 if theres alraedy lecture id, ok: 1}
});

router.get('/remove/:mail/:lecId', async (req, res) => {
  const db = dbHelp.getDB();
  const collection = db.collection('users');

  const email = req.params.mail;
  const lectureId = req.params.lecId;

  let r = await collection.updateOne(
    { email: email },
    { $pull: { lecturesIds: Number(lectureId) } }
  );
  res.json(r);
});

module.exports = router;
