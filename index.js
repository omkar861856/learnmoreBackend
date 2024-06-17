import { MongoClient } from "mongodb";
import bodyparser from "body-parser";
import cors from "cors";
import cookieparser from "cookie-parser";
import express, { response } from "express";
import * as dotenv from "dotenv";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { ServerApiVersion } from "mongodb";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import signInRouter from './routes/signin.js';
import signOutRouter from './routes/signout.js';
import signUpRouter from './routes/signup.js';
import updateUserRouter from './routes/update-user.js';


dotenv.config();
export const app = express();

const corsOptions ={
  origin:'http://localhost:3030', 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200
}
app.use(cors(corsOptions));
app.use(express.json())

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cookieparser());

//set variables in .env file - error - Issue..

const PORT = process.env.PORT;
const WS_PORT = process.env.WS_PORT
export const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL;

export async function hashedPassword(password) {
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

export const client = await MongoConnect();

app.get("/", function (request, response) {
  response.send("🙋‍♂️ Welcome to LT Backend");
});

// Use routes sign in
app.use('/', signInRouter);

// Use routes sign out
app.use('/', signOutRouter);

// Use routes sign up
app.use('/', signUpRouter);

// update user
app.use('/user', updateUserRouter);


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

// const dbName = 'LT';
// const collectionName = 'Enquireys';
// const port = WS_PORT;

// // Create HTTP server
// const server = http.createServer(app);

// // WebSocket Server
// const wss = new WebSocketServer({ port: WS_PORT });

// wss.on('connection', (ws) => {
//     console.log('Client connected');
//     ws.on('close', () => {
//         console.log('Client disconnected');
//     });
// });

// // MongoDB Change Stream
// client.connect().then(() => {
//   const collection = client.db('LT').collection('Enquireys');

//   const changeStream = collection.watch();
//   changeStream.on('change', (change) => {
//       console.log('Change detected:', change);

//       wss.clients.forEach((client) => {
//           if (client.readyState === client.OPEN) {
//               client.send(JSON.stringify(change));
//           }
//       });
//   });
// });




app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
