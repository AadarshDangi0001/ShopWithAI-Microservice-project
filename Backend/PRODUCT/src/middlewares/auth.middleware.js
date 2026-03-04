import jwt from "jsonwebtoken"




function createAuthMiddleware(roles=["user"]) {
    return function authMiddleware(req, res, next) {
       const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
            }
            req.user = decoded;
            next();
        }
        catch (error) {
            console.error('Error verifying token:', error);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
};


export default createAuthMiddleware;
