import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { client, JWT_SECRET } from '../index.js';

const router = express.Router();

router.post("/signin", async (request, response) => {
  const { email, password, login_location } = request.body;

  try {
    const userdb = await client.db("LT").collection("Users").findOne({ email });

    if (userdb) {
      const isSame = await bcrypt.compare(password, userdb.password);

      if (isSame) {
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });

        await markAttendance(email, login_location);

        response.status(200).send({
          msg: "Logged in",
          name: userdb.name,
          role: userdb.role,
          token,
        });
      } else {
        response.status(400).send({ msg: "Invalid credentials" });
      }
    } else {
      response.status(400).send({ msg: "No user found" });
    }
  } catch (error) {
    console.error("Error during signin:", error);
    response.status(500).send({ msg: "Internal server error" });
  }
});

// Function to mark attendance
async function markAttendance(email, loginLocation) {
  const usersCollection = client.db("LT").collection("Users");

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) {
      console.error("User not found");
      return;
    }

    const loginTime = new Date().toISOString();
    const newAttendance = {
      date: loginTime.substring(0, 10),
      loginTime,
      loginLocation,
      logoutTime: null,
      dailyReport: { loginTime, logoutTime: null, breaks: [], activities: [] },
    };

    await usersCollection.updateOne(
      { email },
      { $push: { attendance: newAttendance } }
    );

    console.log("Attendance marked successfully for user:", email);
  } catch (error) {
    console.error("Error marking attendance:", error);
  }
}

export default router;
