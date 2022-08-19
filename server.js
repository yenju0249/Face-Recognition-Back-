const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
//const knex = require('knex');

const database = require('knex')({
    client: 'pg', //PostgreSQL
    connection: {
        host: '127.0.0.1', //home
        port: 5432,
        user: 'postgres',
        password: 'test',
        database: 'smart-brain'
    }
});

database.select('*').from('users').then(data => {
});

const app = express();
// transform input json
app.use(bodyParser.json());
app.use(cors());

app.get('', (req, res) => {
    res.json(database.users);
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    database.select('*').from('users').where({
        id: id
    }).then(user => {
        // cause in js empty array [] still true, so even no data will not be an error
        if (user.length) {
            res.json(user[0]);
        } else {
            res.status(400).json('ID not founded !');
        }
    })
})

// Signin
app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    database.select('email', 'hash').from('login')
        .where('email', '=', email)
        .then(result => {
            const isValid = bcrypt.compareSync(password, result[0].hash);
            if (isValid) {
                return database.select('*').from('users')
                    .where('email', '=', email)
                    .then(user =>
                        res.json(user[0]))
                    .catch(error => res.status(400).json('Unable to catch user!'))
            } else {
                res.status(400).json('Sign in failed!');
            }
        })
        .catch(error => res.status(400).json('Wrong credentials!'))
})

// Register
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    // 加密 
    const hash = bcrypt.hashSync(password);

    database.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        name: name,
                        email: loginEmail[0].email,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json({
                            status: 'S',
                            message: 'Register success',
                            user: user
                        });
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
    }).catch(error => res.status(400).json(
        {
            status: 'E',
            message: 'Register falied'
        }
    ));
})

// update entries when user sent picture
app.put('/image', (req, res) => {
    const { id } = req.body;
    database('users')
        .where('id', '=', id)
        .increment('entries', 1) //every time entries increase 1
        .returning('entries')
        .then(entries => {
            res.json(entries[0].entries);
        }).catch(error => {
            res.status(400).json('Update entries failed')
        })
})

app.listen(3000, () => {
    console.log('app is running on port 3000');
})

/*
/ res => this is working
/ signin => POST = success/fail
/ register => POST= user
/ profile/:user => GET = user
/ image => PUT
*/
