import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import pgconnect from "connect-pg-simple";
import passport from "passport";
import Stratergy from "passport-local";
import bcrypt from "bcrypt";
import env from "dotenv";
import GitHubStrategy from "passport-github";

env.config();

const pgSession=pgconnect(session);
const pgPool = new pg.Pool(
  {
    host: 'localhost',
    user: 'postgres',
    password : process.env.pgPassword,
    database : "secrets",
    port : 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
  );
  
  const db=new pg.Client({
    host : "localhost",
    user : "postgres",
    password : process.env.pgPassword,
    database : "secrets",
    port : 5432,
  });
  
  db.connect();
const stratergy = new Stratergy(
  async function(username,password,done){
    try{
      const results=await pgPool.query("select * from usersh where username=$1",[username]);
      const user=results.rows[0];
      if(results.rows.length===0) return done(null,false);
      if(await bcrypt.compare(password,user.password_hash)){
        return done(null,user);
      }else{
        return done(null,false);
      }
    }catch(err){
      return done(err);
    }
  }
);

const app = express();
const port = 3000;

app.use(session({
  store: new pgSession({
    pool : pgPool,                // Connection pgPool
    createTableIfMissing : true,
    tableName : 'user_sessions'   // Use another table-name than the default "session" one
    // Insert connect-pg-simple options here
  }),
  secret: 'process.env.FOO_COOKIE_SECRET',
  resave: false,
  saveUninitialized : true,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login",(req, res) => {
  if(req.isAuthenticated()) res.redirect("/secrets");
  else res.render("login.ejs");
  // res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const username=req.body.username;
  const password=req.body.password;
  const result=await db.query("select * from usersH where username=$1",[username]);
  const data=result.rows;
  if(data.length>0){
    res.send("username exists try loggin in");
  }else{
    console.log("adding");
    try{
      await db.query("insert into usersh (username,password_hash) values($1,$2)",[username,await bcrypt.hash(password,1)]);
    }catch(err){
      console.log(err);
    }
    res.redirect("/login");
  }
});

app.post("/logOut",(req,res)=>{
  req.logout(()=>res.redirect("/"));
});

app.post("/login", passport.authenticate('local',{successRedirect : "/secrets",failureRedirect : "/login"}));

app.get("/secrets",(req,res)=>{
  if(req.isAuthenticated()){res.render("secrets.ejs");}
  else res.redirect("/");
});

app.get("/auth/github",passport.authenticate('github'));

app.get("/auth/github/callback",passport.authenticate('github',{
  failureRedirect : "/login",
  successRedirect : "/secrets"
}));

app.get("*", (req, res) => res.status(404).send("404 not found"))


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

passport.use(stratergy);

passport.use('github',new GitHubStrategy({
  clientID: process.env.clientID,
  clientSecret: process.env.clientSecret,
  callbackURL: "http://localhost:3000/auth/github/callback"
},
async function(accessToken, refreshToken, profile, cb) {
  try{
    console.log(profile);
    const result=await pgPool.query("select * from usersh where username=$1",[profile.username]);
    if(result.rows.length==0){
      let data=await pgPool.query("insert into usersh(username,password_hash) values($1,$2)",[profile.username,"github"]);
      cb(null,data.rows[0]);
    }else{
      cb(null,result.rows[0]);
    }
  }
  catch(err){
    cb(err,false);
  }
}
));

app.use(
  function (err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }
    console.log(err);
    res.status(500);
    res.send("something wrong");
  }
);

passport.serializeUser((user,done)=>{
  done(null,user);
});

passport.deserializeUser((user,done)=>{
  done(null,user);
});