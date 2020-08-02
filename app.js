//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var authenticated=1;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "hello world.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
mongoose.connect("mongodb+srv://flame1000:flame1000@cluster0.ezjds.mongodb.net/userdb?retryWrites=true&w=majority", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  username: String,
  password: String,
  firstName: String,
  lastName: String,
  email: String,
  rooms: [ {
    roomid: String,
    roomName: String
  } ]
});

const roomSchema = new mongoose.Schema ({
  roomid: String,
  password: String,
  roomName: String,
  orderIdCounter: Number,
  users: [ {
    username: String,
    firstName: String,
    lastName: String
  } ],
  items: [ {
    username: String,
    itemDescription: String,
    orderid: Number,
    status: {
      color: String,
      username: String
    }
  }]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Room = new mongoose.model("Room", roomSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/",function(req,res){
  res.render("landing");
});

app.get("/home", function(req, res){
  if (req.isAuthenticated() && authenticated===1){
    res.render("home", {auth: "1" , firstName: req.user.firstName, lastName: req.user.lastName} );
  } else{
    res.render("home", {auth: "0"} );
  }
});

app.get("/instruct",function(req,res) {
res.render("instruct");
});

app.get("/signup", function(req, res){
  if (req.isAuthenticated() && authenticated===1){
    res.redirect("/home");
  } else{
    res.render("signup");
  }
});

app.get("/profile", function(req, res){
  if (req.isAuthenticated() && authenticated===1){
    res.render("profile", {username: req.user.username, firstName: req.user.firstName,
                          lastName: req.user.lastName, email: req.user.email, rooms: req.user.rooms });
  } else {
    res.redirect("/");
  }
});

app.get("/room", function(req,res){
  if (req.isAuthenticated() && authenticated===1){
    res.render("joinRoom", {username: req.user.username,firstName: req.user.firstName,
                          lastName: req.user.lastName, email: req.user.email, rooms: req.user.rooms });
  } else {
    res.redirect("/home");
  }
});

app.get("/createRoom", function(req,res){
  if (req.isAuthenticated() && authenticated===1){
    res.render("createRoom", {username: req.user.username, firstName: req.user.firstName, lastName: req.user.lastName});
  } else {
    res.redirect("/home");
  }
});

app.get("/joinRoom", function(req,res){
  if (req.isAuthenticated() && authenticated===1){
    res.render("joinRoom", {username: req.user.username, firstName: req.user.firstName, lastName: req.user.lastName});
  } else {
    res.redirect("/home");
  }
});

app.get("/failure",function(req,res){
  authenticated=0;
  res.render("error", {message: "Oops! Your password is incorrect"});
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/home");
});

app.post("/signup", function(req, res){

  var firstName=req.body.firstName;
  var lastName=req.body.lastName;
  var email=req.body.email;
  var username=req.body.username;
  var rooms;

  User.register({username: req.body.username, firstName: req.body.firstName,
                lastName: req.body.lastName, email: req.body.email }, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
        passport.authenticate("local")(req, res, function(){

        User.find( { username: req.body.username } , function(err,users){
            if(err){console.log(err);}
            else{
              rooms=users[0].rooms;
            }
        });

        res.render("profile", {firstName: firstName, lastName: lastName, email: email , username: username, rooms: rooms});
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  var firstName,lastName,email,username,rooms;

  User.find( { username: req.body.username } , function(err,users){
    if(err){
      console.log(err);
    }
    else{
      if(typeof(users)==="undefined" || users.length===0){
        res.render("error", {message: "Oops! User ID does not exist"});
      }
      else{
        name=users[0].name;
        firstName=users[0].firstName;
        lastName=users[0].lastName;
        email=users[0].email;
        username=users[0].username;
        rooms=users[0].rooms;

        req.login(user, function(err){
          if (err) {
            console.log(err);
            res.redirect("/home");
          } else {
            passport.authenticate("local", { failureRedirect: '/failure' })(req, res, function(err){
                authenticated=1;
                res.render("profile", {firstName: firstName, lastName: lastName, email: email ,
                   username: username, rooms: rooms} );
            });
          }
        });

      }
    }
  });

});

app.post("/create", function(req,res){

  //pushing roomid and roomName into the user object which was being used
  User.find( { username: req.body.userName } , function(err,user){
    if(err){
      console.log(err);
    }
    else{
      user[0].rooms.push({ roomid: req.body.roomid , roomName: req.body.roomName });
      user[0].save();
    }
  });

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const newRoom =  new Room({
      roomid: req.body.roomid,
      password: hash,
      roomName: req.body.roomName,
      orderIdCounter: 1
    });
    newRoom.save(function(err){
      if (err) {
        console.log(err);
      } else {

        var users,items;
        //pushing username and name into the room object just created
        Room.find( { roomid: req.body.roomid } , function(err,room){
          if(err){
            console.log(err);
          }
          else{
            room[0].users.push({ username: req.body.userName , firstName: req.body.firstName , lastName: req.body.lastName});
            room[0].save();
            users=room[0].users;
            items=room[0].items;

            res.render("room", {roomName: req.body.roomName,  firstName: req.body.firstName , lastName: req.body.lastName
              , users: users, username: req.body.userName, roomid: req.body.roomid, items: items});
          }
        });
      }
    });
  });

});

app.post("/join", function(req,res){

  const roomid = req.body.roomid;
  const password = req.body.password;
  var users,items;

  Room.find( { roomid: req.body.roomid } , function(err,room){
    if(err){console.log(err);}
    else{
      if(typeof(room)==="undefined" || room.length===0){
        res.render("error", {message: "Oops! Room ID does not exist"});
      }
      else{

        bcrypt.compare(password, room[0].password, function(err, result) {
          if (result === true) {
            // if the password exists then this code runs
            User.find( { username: req.body.userName ,"rooms.roomid" : req.body.roomid } , function(err,user){
              if(err){
                console.log(err);
              }
              else{

                if(user.length===0)
                {
                  //pushing roomid and roomName into the user object which was being used
                  User.find( { username: req.body.userName } , function(err,users){
                    if(err){
                      console.log(err);
                    }
                    else{
                      //finding roomname and then adding it
                      var roomname;
                      Room.find( { roomid: req.body.roomid } , function(err,room){
                        if(err){console.log(err);}
                        else{
                          roomname=room[0].roomName;
                          users[0].rooms.push({ roomid: req.body.roomid , roomName: roomname });
                          users[0].save();

                          room[0].users.push({ username: req.body.userName ,  firstName: req.body.firstName ,
                                 lastName: req.body.lastName });
                          room[0].save();

                          users=room[0].users;
                          items=room[0].items;

                          // finding the room with roomid and password finally------------------------------------------------
                          Room.findOne({roomid: roomid}, function(err, foundRoom){
                            if (err) {
                              console.log(err);
                            } else {

                              if (foundRoom) {
                                if (foundRoom.password === password) {
                                  res.render("room", {roomName: foundRoom.roomName,  firstName: req.body.firstName , lastName: req.body.lastName
                                    , users: users, username: req.body.userName, roomid: req.body.roomid, items: items});
                                }
                                bcrypt.compare(password, foundRoom.password, function(err, result) {
                                  if (result === true) {
                                    res.render("room", {roomName: foundRoom.roomName,  firstName: req.body.firstName , lastName: req.body.lastName
                                      , users: users, username: req.body.userName, roomid: req.body.roomid, items: items});
                                  }
                                });
                              }
                            }
                          });
                          // end of finding founRoom function------------------------------------------------------------------

                        }
                      });
                      // end of room.find
                    }
                  })// end of user.find
                }
                // end of if(user.length===0)
                else{

                  Room.find( { roomid: req.body.roomid } , function(err,room){
                    if(err){
                      console.log(err);
                    }
                    else{
                      users=room[0].users;
                      items=room[0].items;

                      // finding the room with roomid and password finally------------------------------------------------
                      Room.findOne({roomid: roomid}, function(err, foundRoom){
                        if (err) {
                          console.log(err);
                        } else {

                          if (foundRoom) {
                            if (foundRoom.password === password) {
                              res.render("room", {roomName: foundRoom.roomName,  firstName: req.body.firstName , lastName: req.body.lastName
                                , users: users, username: req.body.userName, roomid: req.body.roomid, items: items});
                            }
                            bcrypt.compare(password, foundRoom.password, function(err, result) {
                              if (result === true) {
                                res.render("room", {roomName: foundRoom.roomName,  firstName: req.body.firstName , lastName: req.body.lastName
                                  , users: users, username: req.body.userName, roomid: req.body.roomid, items: items});
                              }
                            });
                          }
                        }
                      });
                      // end of finding founRoom function------------------------------------------------------------------
                    }
                  });
                }
              }
            });
          }
          // ending of if(user.length!==0)
          else{
            // if the password doesnt exist then this code runs
              res.render("error", {message: "Oops! Room Password is incorrect"});
          }
        });

      }
    }
  });

});

app.post("/add", function(req,res){

  var users,items;
  Room.findOne( { roomid: req.body.roomid } , function(err,room){
    if(err){console.log(err);}
    else{
      room.items.push({ username: req.user.username ,
                        itemDescription: req.body.itemDescription,
                        orderid: room.orderIdCounter,
                        status: {
                          color: "red",
                        }});
      room.save();
      room.orderIdCounter=room.orderIdCounter+1;

      users=room.users;
      items=room.items;

      res.render("room",  {roomName: req.body.roomName, firstName: req.user.firstName, lastName: req.user.lastName, users: users,
         username: req.user.username, roomid: req.body.roomid, items: items});
    }
  });
});

app.post("/delete-room",function(req,res){

  var total_items,items=[];
  Room.find( { roomid: req.body.roomid } , function(err,room){
    if(err){console.log(err);}
    else{
      total_items=room[0].items;
      for(var i=0;i<total_items.length;i++)
      {
        if(total_items[i].username===req.user.username)
        {
          items.push(total_items[i]);
        }
      }

      res.render("deleteRoom",  {roomName: req.body.roomName,  firstName: req.user.firstName, lastName: req.user.lastName ,
        username: req.user.username, roomid: req.body.roomid, items: items} );
    }
  });

});

app.post("/delete",function(req,res){
  //console.log(req.body.itemID);

  Room.find( { roomid: req.body.roomid }, function(err,room){
    if(err){console.log(err);}
    else{
      room[0].items.pull({ _id: req.body.itemID });
      room[0].save();

      var total_items,items=[];
      total_items=room[0].items;
      for(var i=0;i<total_items.length;i++)
      {
        if(total_items[i].username===req.user.username)
        {
          items.push(total_items[i]);
        }
      }

      res.render("deleteRoom",  {roomName: req.body.roomName, firstName: req.user.firstName, lastName: req.user.lastName,
        username: req.user.username, roomid: req.body.roomid, items: items} );
    }

  });

});

app.post("/done-delete",function(req,res){

  var users,items;
  Room.find( { roomid: req.body.roomid }, function(err,room){
    if(err){console.log(err);}
    else{
      users=room[0].users;
      items=room[0].items;
      res.render("room",  {roomName: req.body.roomName, firstName: req.user.firstName, lastName: req.user.lastName, users: users,
         username: req.user.username, roomid: req.body.roomid, items: items});
    }
  });
});

app.post("/buy-room",function(req,res){

  var total_items,items=[];
  Room.find( { roomid: req.body.roomid } , function(err,room){
    if(err){console.log(err);}
    else{
      total_items=room[0].items;
      for(var i=0;i<total_items.length;i++)
      {
        if(total_items[i].status.color==="red")
        {
          items.push(total_items[i]);
        }
      }

      res.render("buyRoom",  {roomName: req.body.roomName,  firstName: req.user.firstName, lastName: req.user.lastName,
        username: req.user.username, roomid: req.body.roomid, items: items} );
    }
  });

});

app.post("/buy",function(req,res){

  Room.find( { roomid: req.body.roomid }, function(err,room){
    if(err){console.log(err);}
    else{
      for(var i=0; i<room[0].items.length; i++)
      {if(room[0].items[i]._id == req.body.itemID)
        {
          room[0].items[i].status.color="green";
          room[0].items[i].status.username=req.user.username;
        }
      }
      room[0].save();

      var total_items,items=[];
      total_items=room[0].items;
      for(var i=0;i<total_items.length;i++)
      {
        if(total_items[i].status.color==="red")
        {
          items.push(total_items[i]);
        }
      }

      res.render("buyRoom",  {roomName: req.body.roomName,  firstName: req.user.firstName, lastName: req.user.lastName,
        username: req.user.username, roomid: req.body.roomid, items: items} );
    }

  });

});

app.post("/done-buy",function(req,res){

  var users,items;
  Room.find( { roomid: req.body.roomid }, function(err,room){
    if(err){console.log(err);}
    else{
      users=room[0].users;
      items=room[0].items;
      res.render("room",  {roomName: req.body.roomName,  firstName: req.user.firstName, lastName: req.user.lastName, users: users,
         username: req.user.username, roomid: req.body.roomid, items: items});
    }
  });
});


var portu =process.env.PORT || 3000;
app.listen(portu, function() {
  console.log("Server started on port 3000.");
});
