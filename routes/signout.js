import { app, client, hashedPassword } from "../index.js";
import express from "express";

const router = express.Router();

router.post("/signout", async function (request, response) {
  let { email } = request.body;

  const usersCollection = client.db("LT").collection("Users");

  try {
    let user = await client
      .db("LT")
      .collection("Users")
      .findOne({ email: email });

    if (user) {
      const logoutTime = new Date();

      // Update the latest attendance record with logout time
      const attendance = user.attendance;
      if (attendance && attendance.length > 0) {
        const latestAttendance = attendance[attendance.length - 1];
        latestAttendance.logoutTime = logoutTime;
        latestAttendance.dailyReport.logoutTime = logoutTime;

        await usersCollection.updateOne(
          { email, "attendance.date": latestAttendance.date },
          { $set: { "attendance.$": latestAttendance } }
        );

        response.status(200).send({ message: "Logout time recorded successfully" });
      } else {
        response
          .status(400)
          .send({ message: "No attendance record found for today" });
      }
    } else {
      return response.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error updating logout time:", error);
    response.status(500).send({ message: "Failed to update logout time" });
  }
});

export default router;
