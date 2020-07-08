const express = require('express');
const app=express();
const cors = require('cors');
var bodyParser = require('body-parser');
var multer = require('multer')
const webpush = require('web-push')
const { Pool, Client } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
 
});

const privatevapid = "MVOj0zuyzhRV7JeElhiCRhMS2937-7FIFQHf7yF5cf4";
const webpushcontact ="mailto: ridhikajain1990@gmail.com"
const publicvapid =
"BPFyAluQ7WODEbJJ91Wo7xJChQ5lvTfQMWxR9IdITLwBCGsyNl--Lf49_4hRX9DP8sIsO-Pd6OoANRvqgYikimM";
function sendViewMiddleware(req, res, next) {
    res.sendView = function(view) {
        return res.sendFile(__dirname + "/public/" + view);
    }
    next();
}
webpush.setVapidDetails(webpushcontact, publicvapid, privatevapid)
app.use(sendViewMiddleware);

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

var storage = multer.diskStorage({
      destination: function (req, file, cb) {
      cb(null, 'server/public')
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname )
     
    }
})

var upload = multer({ storage: storage }).single('file');


app.get('/',function(req,res){
  res.send("Hello");
})

//Uploading CV and Profile Picture

app.post('/upload',function(req, res) {
     
    upload(req, res, function (err) {
           if (err instanceof multer.MulterError) {
               return res.status(500).json(err)
           } else if (err) {
               return res.status(500).json(err)
           }
         
var imgname=req.file.originalname;
var iddata=imgname.split('-');
if(iddata[0] === 'profile')
{
 var q=`UPDATE users SET image='${imgname}' WHERE id=${iddata[1]}`;
}
if(iddata[0] === 'cv')
{
   var q=`UPDATE users SET cv='${imgname}' WHERE id=${iddata[1]}`;

}
  pool.query(q,(err1,res1) =>{
    if(err1)  throw err1;
})
      return res.status(200).send(req.file)

    })
  })

//Retrieving Profile Picture and CV

app.post('/public',(req,res)=>{
  var pic=req.body.id;
res.sendView(`${pic}`)
})


//Getting conversation between 2 users

app.post('/convo',(req,res)=>{
var msg=req.body.msg;
var q=`UPDATE message set is_read=true WHERE msg_thread='${msg}'`;
pool.query(q);
var query=`SELECT * from message WHERE msg_thread='${msg}' order by time asc`;
 pool.query(query)
  .then(data => res.status(200).json(data.rows))
  .catch(err => res.status(400).json('not able to get Messages'));


})

// Sending message to a user

app.post('/sendmessage',(req,res)=>{
  var id=req.body.id;
  var msg=req.body.msg;
  var name=req.body.name;
  var sender_id=req.body.send_id;
  if(id<sender_id)
  {
    var msg_thread=`${id}-${sender_id}`;
  }
  else
  {
    var msg_thread=`${sender_id}-${id}`;
  }
  var t=Date.now();
  var sender_name=req.body.send_name;
  var query=`INSERT INTO message(user_id_to,msg,user_name_to,user_id_from,user_name_from,time,is_read,msg_thread) VALUES(${id},'${msg}','${name}',${sender_id},'${sender_name}',to_timestamp(${t/1000}),false,'${msg_thread}')`;
   pool.query(query)
  .then(data => {
    var q=`Update users set notifications='yes' WHERE id=${id}`;
    pool.query(q);
    res.status(200).json("Message Sent")})
  .catch(err => res.status(400).json('not able to send message'));

})

// Retrieving all the messages

app.get('/message',function(req,res){
  
  var query="SELECT * FROM message order by id desc";
   pool.query(query)
  .then(data => res.status(200).json(data.rows))
  .catch(err => res.status(400).json('not able to get Messages'));
 
})

//Registering new User

app.post('/register',(req,res)=>{
	var name=req.body.name;
	var email=req.body.email;
	var phone=req.body.phone;
	var role=req.body.role;
	var password=req.body.password;
  var technology=req.body.technology;

   var query=`INSERT INTO users(name, email,phone,job,speciality,image,cv,interested,experience,about)VALUES('${name}','${email}','${phone}','${role}','${technology}','','','',null,'') returning id`;

 pool.query(query)
  .then(data => {
    var id=data.rows[0].id;
    
   var q=`INSERT INTO login(email,password,profile,user_id)VALUES('${email}','${password}','not completed',${id})`;
      pool.query(q,(err1,res1) =>{
    if(err1)  throw err1;
    res.status(200).json('Registered');
    })
    })

  .catch(err => res.status(400).json('Not Valid Registration'))
    
})

//Getting profile data for particular user

app.post('/profiledata',(req,res)=>{
  var id=req.body.id;
  var query=`SELECT * FROM users,login WHERE users.id=login.user_id AND users.id=${id}`;
   pool.query(query)
  .then(data => res.status(200).json(data.rows[0]))
  .catch(err => res.status(400).json('not able to get Profile'));

})

// retrieving messages for particular User and setting notification to false

app.post('/messageuser',(req,res)=>{
  var id=req.body.id;
  var query=`SELECT * FROM message WHERE user_id_to=${id} OR user_id_from=${id} order by time`;
   pool.query(query)
  .then(data => {
 var q=`Update users set notifications='no' WHERE id=${id}`;
    pool.query(q);

    res.status(200).json(data.rows)})
  .catch(err => res.status(400).json('not able to get Messages'));

})

//Deleting any particular user from login user and message table

app.post('/delete',(req,res)=>{
  var id=req.body.id;
  var query=`DELETE FROM users WHERE id=${id}`;
   pool.query(query)
  .then(data => { var q=`DELETE FROM login WHERE user_id=${id}`;
   pool.query(q,(err1,res1) =>{
    if(err1)  throw err1;
    })
   var qq=`DELETE from message WHERE user_id_to=${id} OR user_id_from=${id}`;
   pool.query(qq,(err1,res1) =>{
    if(err1)  throw err1;
    })
    })
  .catch(err => res.status(400).json('not able to delete'));
  getUsers(function (err, Result){ 
      res.json(Result.rows);
   });

})

function getUsers(callback) {    
        pool.query("SELECT * FROM users WHERE id!=6",
            function (err, rows) {
                //here we return the results of the query
                callback(err, rows); 
            }
        );    
}


//If profile is complete for particular user

app.post('/complete',(req,res)=>{
  var about=req.body.about;
  var experience=req.body.experience;
  var technology=req.body.technology;
  var id=req.body.id;
  var tech=' ';
for(var i=0;i<technology.length;i++)
{
  tech=tech+technology[i]+',';
}
var q=`UPDATE users SET about='${about}' , experience=${experience} , interested='${tech}' WHERE id=${id}`;
       pool.query(q,(err1,res1) =>{
    if(err1)  throw err1;
})
       if(about !== '' && experience !== '' && tech !== '')
       {
      var query=`SELECT * from users WHERE id=${id}`;
      pool.query(query)
  .then(data => {
    if(data.rows[0].image !== '' && data.rows[0].cv!== '')
      var qq=`UPDATE login SET profile='complete' WHERE user_id=${id}`;
    pool.query(qq)
  })
  }

      return res.status(200).json('Complete');
})

//User editing its profile

app.post('/edituser',(req,res)=>{
  var about=req.body.about;
  var experience=req.body.experience;
  var job=req.body.job;
  var phone=req.body.phone;
  var interested=req.body.interested;
  var speciality=req.body.speciality;
  var id=req.body.id;

var q=`UPDATE users SET about='${about}' , experience=${experience} , interested='${interested}' , phone='${phone}',speciality='${speciality}',job='${job}' WHERE id=${id}`;
      
       pool.query(q)
  .then(data => res.status(200).json("Updated"))
  .catch(err => res.status(400).json('User not updated'));
})

//View List for all the users 
 
app.post('/viewlist',function(req,res){
  var id=req.body.id;
  var query=`SELECT * from users WHERE id !=${id}`
  pool.query(query)
  .then(data => res.status(200).json(data.rows))
  .catch(err => res.status(400).json('not able to get Messages'));
})

//Sign-in logic

app.post('/signin',(req,res)=>{
  
  var email=req.body.email;
  var password=req.body.password;

  var query=`SELECT * FROM login WHERE email='${email}' AND password='${password}'`;
   pool.query(query).then(result=>
   {
    if(result.rows[0])
    {
   var query1=`SELECT * from users,login WHERE users.id=login.user_id AND users.email='${email}'`;
  pool.query(query1)
  .then(data => res.status(200).json(data.rows[0]))
}
else
{
  res.status(400).json('Invalid Credentials');
}
  })
  .catch(err => res.status(400).json('notValid User'));

  
})

//Notification not used 

app.post('/notifications/subscribe', (req, res) => {
  const subscription = req.body

 

  const payload = JSON.stringify({
    title: 'Hello!',
    body: 'It works.',
  })

  webpush.sendNotification(subscription, payload)
    .then(result => console.log(result))
    .catch(e => console.log(e.stack))

  res.status(200).json({'success': true})
});

app.listen(process.env.PORT,()=>{
  console.log(`app is running on server port : ${process.env.PORT}`);
});