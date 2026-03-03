import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";


export const authenticateToken = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next(); 
    }
    catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
