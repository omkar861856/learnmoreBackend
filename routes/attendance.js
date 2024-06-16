// routes/attendance.js

import express from 'express';
import { client } from '..';

const router = express.Router();

// POST /api/attendance - Mark attendance for a user
router.post('/', async (req, res) => {
  const { email, login_Location, login_Time } = req.body;

  const db = client.db('LT');
  const usersCollection = db.collection('Users');

  try {
    // Find the user by email
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare new attendance record
    const newAttendance = {
      date: login_Time.substring(0, 10), // Extract date from loginTime
      login_Time,
      login_Location,
      logoutTime: null,
      dailyReport: {
        login_Time,
        logoutTime: null,
        breaks:[],
        activities: []
      }
    };

    // Update user document with new attendance record
    await usersCollection.updateOne(
      { email },
      { $push: { attendance: newAttendance } }
    );

    res.status(200).json({ message: 'Attendance marked successfully' });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

export default router;
