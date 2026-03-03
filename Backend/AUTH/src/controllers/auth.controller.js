import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

async function registerUser(req, res) {
    const { username, email, password, fullName = {} } = req.body;
    const { firstName, lastName } = fullName;

    try {
        const existingUser = await userModel.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({ error: 'Email or Username already in use' });
        }

        const hash = await bcrypt.hash(password, 10);

        const newUser = new userModel({
            username,
            email,
            password: hash,
            fullName: {
                firstName,
                lastName
            }
        });

        const token = jwt.sign({
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const savedUser = await newUser.save();

        return res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                fullName: savedUser.fullName
            },
            role: savedUser.role,
            address: savedUser.addresses
        });
    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function loginUser(req, res) {
    const { email, username, password } = req.body;

    try {
        const query = email ? { email } : { username };
        const user = await userModel.findOne(query).select('+password');

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName
            },
            role: user.role,
            address: user.addresses
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getCurrentUser(req, res) {
    const user = req.user;

    return res.status(200).json({
        message: 'Current user fetched successfully',
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            address: user.addresses
        }
    });
}

export { registerUser, loginUser, getCurrentUser };

