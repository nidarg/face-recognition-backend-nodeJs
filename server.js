const express = require('express');
const bodyParser = require('body-parser');

const bcrypt = require('bcrypt-nodejs'); // used to encrypt password

const cors = require('cors'); // to accept http requests, otherwise accepts only https

const knex = require('knex'); // like sequelize -> a package -> SQL query builder

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'george11.02.2014',
      database : 'face-recognition'
    }
  });

  

const app = express();

app.use(bodyParser.json());

app.use(cors());

app.get('/', (req, res,next)=>{
    res.send('is workig');
})

app.post('/signin', (req, res, next)=>{
    // verify in login table if email is same with email from req.body
    // if it is, verify if password has the same hash as in login table 
    // with helper function bcrypt.compare
    // if so, grab from users table the user wit the same email address

    //validation -> see register
    const {email, password} = req.body;
    if(!password || !email){
        return res.status(400).json('incorrect form submission');
    }
    db.select('*').from('login')
        .where('email', '=', email)
        .then(data=>{
            const isValid = bcrypt.compareSync(password,data[0].hash);
            if(isValid){
                return db.select('*').from('users')
                    .where('email', '=', email )
                    .then(user=>{
                        res.json(user[0])
                    })
                    .catch(err=> res.status(400).json('unable to get user'));
            }else{
                res.status(400).json('wrong credentials');
            }

        })
        .catch(err=> res.status(400).json('wrong credentials'));
});

app.post('/register', (req,res,next)=>{
    const{name, email, password} = req.body;

    //validation of received data
    if(!name || !email || !password ){
        return res.status(400).json('incorrect form submission');
    }
    const hash = bcrypt.hashSync(password);//encrypt password
    // because we have a relational database between users and login
    // we use transactions 
    /*
        Transactions are an important feature of relational databases,
         as they allow correct recovery from failures 
         and keep a database consistent even in cases of system failure.
        All queries within a transaction are executed on the same database
         connection, and run the entire set of queries 
         as a single unit of work. 
         Any failure will mean the database will rollback any 
         queries executed on that connection to the pre-transaction state.

        Transactions are handled by passing 
        a handler function into knex.transaction. 

    */

    // when register update both tables users and login

    db.transaction(trx=>{
        trx.insert({
            hash:hash,
            email:email
        })
        .into ('login')
        .returning('email')
        .then(loginEmail=>{

            return trx('users')
            .returning('*')
            .insert({
                email:loginEmail[0],
                name:name,
                joined:new Date()
            })
            // after insert new user into db send response(user) to frontend
            .then(user=>{
                res.json(user[0]);
            })
        })
        // commit transaction
        .then(trx.commit)
        .catch(trx.rollback)
    })
       
        .catch(err=> res.status(400).json('unnable to register'));
    })

app.get('/profile/:id', (req,res,next)=>{
    const{id} = req.params;
   db.select('*').from('users').where({id:id})
    .then(user=>{
        if(user.length){
            res.json(user[0]);
        }else{
            res.stattus(400).json('Not found')
        }      
    })
    .catch(err=>res.status(400).json('no user, no profile :))'))
})

// increment entries
app.put('/image', (req,res,next)=>{
    const{id} = req.body;
    db('users').where( 'id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries=>{
        res.json(entries[0]);
    })
    .catch(err=> res.status(400).json('no user, no entries :))'))
})

app.listen(3000,()=>{
    console.log('Server is running');
});

