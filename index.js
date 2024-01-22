import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const db=new pg.Client({
  host : "localhost",
  user : "postgres",
  password : "Nikesh@123",
  database : "secrets",
  port : 5432,
});

db.connect();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  console.log(req.body.username);
  console.log(req.body.password);
  const username=req.body.username;
  const password=req.body.password;
  const result=await db.query("select * from users where username=$1",[username]);
  const data=result.rows;
  console.log(data);
  if(data.length>0){
    res.send("username exists try loggin in");
  }else{
    try{
      await db.query("insert into users (username,password) values($1,$2)",[username,password]);
    }catch(err){
      res.redirect("/");
    }
    res.render("secrets.ejs");
  }
});

app.post("/login", async (req, res) => {
  console.log(req.body.username);
  console.log(req.body.password);
  const username=req.body.username;
  const enteredPassword=req.body.password;
  try{
    const result=await db.query("Select password from users where username=$1",[username]);
    const data=result.rows;
    const password=data[0].password;
    console.log(password);
    console.log(enteredPassword);
    if(password==enteredPassword) res.render("secrets.ejs");
    else res.redirect("/");
  }catch(err){
    console.log(err);
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
