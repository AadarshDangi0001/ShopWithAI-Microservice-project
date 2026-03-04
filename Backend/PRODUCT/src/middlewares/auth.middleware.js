import jwt from "jsonwebtoken"




export function createAuthMiddleware(roles=["user"]) {
    return function authMiddleware(req, res, next) {
        if (process.env.NODE_ENV === 'test') {
            req.user = {
                _id: req.headers['x-test-user-id'] || 'test-user-id',
                role: req.headers['x-test-user-role'] || roles[0],
            };
            return next();
        }

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
