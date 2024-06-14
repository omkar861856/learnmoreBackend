import { MongoClient } from "mongodb";
import bodyparser from "body-parser";
import cors from "cors";
import cookieparser from "cookie-parser";
import express, { response } from "express";
import * as dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { ServerApiVersion } from "mongodb";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";


dotenv.config();
const app = express();

app.use(cors());

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cookieparser());

//set variables in .env file - error - Issue..

const PORT = process.env.PORT;
const WS_PORT = process.env.WS_PORT
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL;

async function hashedPassword(password) {
  const NO_OF_ROUNDS = 10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

async function MongoConnect() {
  const client = await new MongoClient(MONGO_URL, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  }).connect();
  console.log("Mongo Connected");
  return client;
}

const client = await MongoConnect();

app.get("/", function (request, response) {
  response.send("🙋‍♂️ Welcome to LT Backend");
});

// signin signup and signout user

app.post("/signup", async function (request, response) {
  let { name, email, password, role_radio } = request.body;
  let userdb = await client
    .db("LT")
    .collection("Users")
    .findOne({ email: email });
  if (userdb) {
    response.status(200).send({ msg: "User already present" });
  } else {
    const hashedPass = await hashedPassword(password);
    const dailyreport = [];
    let result = await client.db("LT").collection("Users").insertOne({
      name,
      email,
      password: hashedPass,
      role: role_radio,
      dailyreport,
    });
    response.status(201).send({ msg: "User added" });
  }
});

app.post("/signin", async (request, response) => {
  let { email, password, login_location, date, time } = request.body;
  let userdb = await client
    .db("LT")
    .collection("Users")
    .findOne({ email: email });

  if (userdb) {
    const isSame = await bcrypt.compare(password, userdb.password);

    if (isSame) {
      var token = jwt.sign({ email: email }, JWT_SECRET);

      await client
        .db("LT")
        .collection("Users")
        .findOne(
          { email: email },
          {
            $push: {
              dailyreport: {
                login_location,
                date,
                time,
              },
            },
          }
        );

      response.status(200).send({
        msg: "logged in",
        name: userdb.name,
        role: userdb.role,
        token,
      });
    } else {
      response.status(400).send({ msg: "invalid credentials" });
    }
  } else {
    response.status(400).send({ msg: "no user found" });
  }
});

app.post("/signout", async function (request, response) {
  let { email, password } = request.body;
  let userdb = await client
    .db("LT")
    .collection("Users")
    .findOne({ email: email });
  if (userdb) {
    response.status(200);
  } else {
    const hashedPass = await hashedPassword(password);
    let result = await client
      .db("LT")
      .collection("Users")
      .insertOne({ email: email, password: hashedPass });
    response.status(201).send({ msg: "User added " });
  }
});

// for blog editor

app.post("/editor/:id", async function (request, response) {
  try {
    const id = request.params.id;
    const content = request.content;
    let blogdb = await client.db("LT").collection("Drafts").findOne({ id });

    if (blogdb) {
      response
        .status(200)
        .send({ msg: `Draft of ${id} already present`, blogdb });
    } else {
      let result = await client.db("LT").collection("Drafts").insertOne({
        id,
        content,
      });
      response.status(201).send({ msg: `Draft of ${id} added`, result });
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

// reste password
app.post("/reset", async function (request, response) {
  let { email, password } = request.body;
  let userdb = await client
    .db("SingIn")
    .collection("Users")
    .findOne({ email: email });
  console.log(request.body);
  if (userdb) {
    const hashedPass = await hashedPassword(password);
    let result = await client
      .db("SingIn")
      .collection("Users")
      .updateOne({ email: email }, { $set: { password: hashedPass } });
    response.send({ msg: "password updated", email });
  } else {
    response.status(400).send({
      msg: "wrong mail stored in session storage, go all over again",
      email,
    });
  }
});

// web socket

const dbName = 'LT';
const collectionName = 'Enquireys';
const port = WS_PORT;

// WebSocket server setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

async function startSocketServer() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('LT');``
    const collection = db.collection('Enquireys');

    // Watch the collection for changes
    const changeStream = collection.watch();

    changeStream.on('change', (change) => {
      console.log('Change detected:', change);

      // Broadcast the change to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(change));
        }
      }); 
    });

    server.listen(port, () => {
      console.log(`Socket Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

// server has to be closed after work done if may cause problem when many connections

startSocketServer();


app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
