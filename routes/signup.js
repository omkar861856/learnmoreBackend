import { app, client, hashedPassword } from "../index.js";
import express from 'express'

const router = express.Router();

// signin signup and signout user
router.post("/signup", async function (request, response) {
  let { name, email, password, role_radio } = request.body;

  let userdb = await client
    .db("LT")
    .collection("Users")
    .findOne({ email: email });
  if (userdb) {
    response.status(200).send({ msg: "User already present" });
  } else {
    const hashedPass = await hashedPassword(password);
    const userToInsert = {
      name: name,
      email: email,
      photoURL:"",
      createdAt: new Date(),
      password: hashedPass,
      role: role_radio,
      holidays: [],
      leaves: [],
      attendance: []
    };

    let result = await client.db("LT").collection("Users").insertOne(userToInsert);
    response.status(201).send({ msg: "User added" });
  }
});

export default router;

