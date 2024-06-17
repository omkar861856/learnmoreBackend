import { client } from "../index.js";
import express from 'express'

const router = express.Router();

const updateUserProfile = async (req, res) => {
    const { email, name, photoUrl } = req.body;

    if ((!name && !photoUrl)) {
        return res.status(400).json({ message: 'At least one field (name or photoUrl) are required' });
    }

    try {
        const db = client.db('LT');
        const collection = db.collection('Users');

        const updateFields = {};
        if (name) updateFields.name = name;
        if (photoUrl) updateFields.photoUrl = photoUrl;

        const result = await collection.updateOne(
            { email },
            { $set: updateFields }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'User not found or no changes made' });
        }

        res.json({ message: 'User profile updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


router.put('/update-profile', updateUserProfile);



export default router;
