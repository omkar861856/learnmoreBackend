import { MongoClient } from "mongodb";
import bodyparser from "body-parser";
import cors from "cors";
import cookieparser from "cookie-parser";
import express, { response } from "express";
import * as dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();

app.use(cors());

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cookieparser());

//set variables in .env file - error - Issue..

const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL;

async function hashedPassword(password) {
  const NO_OF_ROUNDS = 10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

async function MongoConnect() {
  const client = await new MongoClient(MONGO_URL).connect();
  console.log("Mongo Connected");
  return client;
}

const client = await MongoConnect();

app.get("/", function (request, response) {
  
  response.send("🙋‍♂️ Welcome to LT Backend");
});

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
    let result = await client
      .db("LT")
      .collection("Users")
      .insertOne({
        name,
        email,
        password: hashedPass,
        role_radio,
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

      response.status(200).send({ msg: "logged in", token });
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

app.get("/profile/:email", async function (request, response) {
  try {
    const email = request.params.email;
    let userdb = await client
      .db("SingIn")
      .collection("Users")
      .findOne({ email: email });
    // request.header("x-auth-token",userdb.token)
    let data = await client
      .db("SingIn")
      .collection("Profile")
      .findOne({ email: email });
    console.log("data here", data);
    response.send({ data });
  } catch (error) {
    console.log(error);
  }
});

app.post("/sendmail", async function main(request, response) {
  var previewurl = "";
  let { email } = request.body;
  let userdb = await client
    .db("SingIn")
    .collection("Users")
    .findOne({ email: email });
  if (userdb) {
    try {
      // Generate test SMTP service account from ethereal.email
      // Only needed if you don't have a real mail account for testing
      let testAccount = await nodemailer.createTestAccount();

      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });

      transporter.verify(function (error, success) {
        if (error) {
          console.log(error);
        } else {
          console.log("Server is ready to take our messages", success);
        }
      });

      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: '"Fred Foo 👻" <companyemail@gmail.com>', // sender address
        to: `${email}`, // list of receivers
        subject: "Reset Password ✔", // Subject line
        text: "Rest Your Password...", // plain text body
        html: `<div><h1>Click the below link to go to password reset page 👉 </h1><a href="https://signinsignupreacttailwind.netlify.app/reset">click this link to reset password</a></div>`, // html body
      });

      console.log("Message sent: %s", info.messageId);
      // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

      // Preview only available when sending through an Ethereal account
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
      var previewurl = nodemailer.getTestMessageUrl(info);
      response.send({ msg: "email sent", previewurl: previewurl });
    } catch (error) {
      console.log(error);
    }
  } else {
    response.status(401).send({ msg: "email not found in db" });
  }
});

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

app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
