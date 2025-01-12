const express = require('express');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const expressSession = require('express-session');
const db = require('./db');
const hbs = require('express-handlebars');
const path = require('path');
const mysql = require('mysql2');
const async = require('async');

const admin = require('./routes/admin');
const bcrypt = require('bcrypt');
const app = express();

//configuration
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//app.engine('hbs', hbs({defaultLayout: 'main'}));

//app.set('view engine', 'hbs');
//use middleware
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(expressSession({
  secret: 'ATP3',
  saveUninitialized: false,
  resave: false
}));


app.use(express.static('./public'));



// typeahead

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect();


app.get('/search', function (req, res) {
  connection.query('SELECT Medicine_Name from medicine_information where Medicine_Name like "%' + req.query.key + '%"', function (err, rows, fields) {
    if (err) throw err;
    var data = [];
    for (i = 0; i < rows.length; i++) {
      data.push(rows[i].Medicine_Name);
    }
    res.end(JSON.stringify(data));
  });
});


// Routes
app.get('/', function (req, res) {
  res.render('view_login', {
    title: 'Login Panel',
    message: '',
    message_type: '',
    errors: ''
  });
});

app.post('/', function (req, res) {

  // Login validations
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();

  req.getValidationResult().then(function (result) {
    if (!result.isEmpty()) {
      res.render('view_login', {
        title: 'Login Panel',
        message: '',
        message_type: '',
        errors: result.array(),
        user: req.session.loggedUser,
      });

    } else {
      const user = {
        username: req.body.username,
        password: req.body.password,
        UserType: ''
      }

      const query = "SELECT * FROM user_access WHERE username = ?";
      db.getData(query, [user.username], function (rows) {
        console.log(rows[0]);
        if (!rows[0]) {
          res.render('view_login', {
            title: 'User Login',
            message: 'Login Failed! Enter Correct Information.',
            message_type: 'alert-danger',
            errors: ''
          });
        } else {
          // Compare entered password with the stored hashed password
          bcrypt.compare(user.password, rows[0].password, function (err, isMatch) {
            if (err) {
              console.error(err);
              res.render('view_login', {
                title: 'User Login',
                message: 'An error occurred.',
                message_type: 'alert-danger',
                errors: ''
              });
            } else if (isMatch) {
              console.log("Password matched!");

              user.UserType = rows[0].Usertype; 
              req.session.loggedUser = user;  


              req.session.loggedUser = {
                username: rows[0].username,
                UserType: user.UserType
              };

              // Redirect based on UserType
                        if (rows[0].Usertype == 'Admin') {

            user.UserType = 'Admin';
            req.session.loggedUser = user;

            res.redirect('/admin');

          } else if (rows[0].Usertype == 'Staff') {

            user.UserType = 'Staff';
            req.session.loggedUser = user;

            res.redirect('/admin');

          }
            }
          });
        }
      });
    } // validation end
  });
});


app.get('/admin', function (req, res) {

  if (!req.session.loggedUser) {
    res.redirect('/');
    return;
  }


  // IMPORTANT ROUTING NOTE ******************************
  // add the below code in admin.js => router.get('/')  **
  // exectly same code needs there to work properly     **
  // *****************************************************

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const totalSell = "select ROUND(SUM(Total_Payable),2) AS sells_count from bill_information";
const todaySell = "select ROUND(SUM(Total_Payable),2) AS sells_count_today from bill_information where Date = CURDATE()";
const totalUser = "SELECT COUNT(*) AS users_count FROM user_information";
const totalBatch = "SELECT COUNT(*) AS batch_count FROM batch";
const totalMedicine = "SELECT COUNT(*) AS med_count FROM medicine_information";
const totalSupplier = "SELECT COUNT(*) AS sup_count FROM supplier";
const totalCategory = "SELECT COUNT(*) AS cat_count FROM category";
const totalGeneric = "SELECT COUNT(*) AS generic_count FROM drug_generic_name";
const totalManufac = "SELECT COUNT(*) AS manufac_count FROM manufacturer";

async.parallel([
    function (callback) {
        connection.query(totalSell, callback)
    },
    function (callback) {
        connection.query(todaySell, callback)
    },
    function (callback) {
        connection.query(totalUser, callback)
    },
    function (callback) {
        connection.query(totalBatch, callback)
    },
    function (callback) {
        connection.query(totalMedicine, callback)
    },
    function (callback) {
        connection.query(totalSupplier, callback)
    },
    function (callback) {
        connection.query(totalCategory, callback)
    },
    function (callback) {
        connection.query(totalGeneric, callback)
    },
    function (callback) {
        connection.query(totalManufac, callback)
    }
], function (err, rows) {


    console.log(rows[0][0]);
    console.log(rows[1][0]);
    console.log(rows[2][0]);


    // those data needs to be shown on view_admin.ejs
    // Dashboard page requires those data
    // NOT WORKING PROPERLY

    res.render('view_admin', {
        'totalSell': rows[0][0],
        'todaySell': rows[1][0],
        'totalUser': rows[2][0],
        'totalBatch': rows[3][0],
        'totalMedicine': rows[4][0],
        'totalSupplier': rows[5][0],
        'totalCategory': rows[6][0],
        'totalGeneric': rows[7][0],
        'totalManufac': rows[8][0],
        'user': req.session.loggedUser
    });
});



});



// routes
app.use('/admin', admin);

const PORT = process.env.PORT
//start the server
app.listen(PORT, function () {
  console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;