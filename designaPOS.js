const dotenv = require("dotenv").config({ path: "./.env" });
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bodyParser = require("body-parser");

const apiRoutes = require("./routes/app");
const adminRoutes = require("./routes/admin");
var cors = require('cors')

app.use(bodyParser.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors())


function setupCORS(req, res, next) {
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "token",
    "X-Requested-With, Content-type,Accept,X-Access-Token,X-Key"
  );
  res.header("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(200).end();
  } else {
    next();
  }
}


app.all("/*", setupCORS);

//app api's
app.use("/v1/api", apiRoutes);
app.use("/v1/admin", adminRoutes);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
  })
  .then((connection) => {
    if (connection) {
      app.listen(process.env.PORT);
      console.log("Database Connected !!!");
      console.log(`admin server running on ${process.env.PORT} !!!`);
    } else {
      console.log("Error while connecting to database");
    }
  })
  .catch((err) => {
    console.log("catched database connection error :", err);
  });