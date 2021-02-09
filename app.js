//jshint esversio
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();
console.log(process.env.API_KEY);
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  secret: "our little secret",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const userSchema =  new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);
const secretSchema = mongoose.Schema({
  secretU: String,
  comment: String
});
const Secret = new mongoose.model("Secret", secretSchema);
// passport.use(new LocalStrategy(User.authenticate()));
//
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser())
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/",function(req, res){
  res.render("home");
});
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get("/login",function(req, res){
  res.render("login");
});
app.get("/register",function(req, res){
  res.render("register");
});
app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        Secret.find({"comment": {$ne: null}}, function(err, foundSecret){
          if(foundSecret){
            res.render("secrets", {usersWithSecrets: foundUsers, secret: foundSecret});
          }else{
            res.render("secrets", {usersWithSecrets: foundUsers});
          }
        });
      }
    }
  });
});
app.post("/secrets", function(req, res){
  const secret = req.body.bsec,
        comment = req.body.inpcomment;
        const newComment = new Secret({
          secretU: secret,
          comment: comment
        });
        newComment.save(function(err){
          if(!err){
            res.redirect("/secrets");
          }else{
            console.log(err);
          }
        });
})
app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});
app.post("/submit", function(req, res){
  const submitedSecret = req.body.secret;
  console.log(req.user._id);
  User.findById(req.user._id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submitedSecret;
        foundUser.save();
        res.redirect("/secrets");
      };
    };
  });
})
app.get("/logout",function(req, res){
  req.logout();
  res.redirect("/");
})
app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets")
      })
    }
  })
});

app.post("/login", function(req, res){
const user = new User({
  username: req.body.username,
  password: req.body.password
});
req.login(user, function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets")
    })
  }
})

});





app.listen(process.env.PORT || 3000, function(){
  console.log("ok");
})
