import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import pgconnect from "connect-pg-simple";
import passport from "passport";
import Stratergy from "passport-local";
import bcrypt from "bcrypt";

const pgSession=pgconnect(session);
const pool = new pg.Pool(
  {
    host: 'localhost',
    user: 'postgres',
    password : 'Nikesh@123',
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
    password : "Nikesh@123",
    database : "secrets",
    port : 5432,
  });
  
  db.connect();
const stratergy = new Stratergy(
  async function(username,password,done){
      try{
        const results=await pool.query("select * from usersh where username=$1",[username]);
        const user=results.rows[0];
        if(results.rows.length===0) done(null,false);
        if(await bcrypt.compare(password,user.password_hash)){
          done(null,user);
        }else{
          done(null,false);
        }
      }catch(err){
        done(err);
      }
    }
);

const app = express();
const port = 3000;

app.use(session({
  store: new pgSession({
    pool : pool,                // Connection pool
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
  // console.log(req.body.username);
  // console.log(req.body.password);
  const username=req.body.username;
  const password=req.body.password;
  const result=await db.query("select * from usersH where username=$1",[username]);
  const data=result.rows;
  // console.log(data);
  if(data.length>0){
    res.send("username exists try loggin in");
  }else{
    console.log("adding");
    try{
      await db.query("insert into usersh (username,password_hash) values($1,$2)",[username,await bcrypt.hash(password,1)]);
    }catch(err){
      // res.redirect("/");
      console.log(err);
    }
    // res.render("secrets.ejs");
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
  // res.redirect("/");
});

app.get("*", (req, res) => res.status(404).send("404 not found"))


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

passport.use(stratergy);

app.use(
  function (err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }
    console.log(err);
    res.status(500);
    res.send("something wrong");
    // res.render('error', { error: err })
  }
);

passport.serializeUser((user,done)=>{
  done(null,user);
});

passport.deserializeUser((user,done)=>{
  done(null,user);
});