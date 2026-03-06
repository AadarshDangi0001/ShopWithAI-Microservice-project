import jwt from "jsonwebtoken"




export function createAuthMiddleware(roles=["user"]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return function authMiddleware(req, res, next) {
        if (process.env.NODE_ENV === 'test') {
            const userIdFromHeader = req.headers['x-test-user-id'];
            const roleFromHeader = req.headers['x-test-user-role'];
            const userIdFromCookie = req.cookies?.userId;
            const roleFromCookie = req.cookies?.role;
            const tokenFromCookie = req.cookies?.token;

            const userId = userIdFromHeader || userIdFromCookie;
            const role = roleFromHeader || roleFromCookie || allowedRoles[0];

            // In test mode, require either legacy x-test headers or a token cookie.
            if (!userId || (!userIdFromHeader && !tokenFromCookie)) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            req.user = {
                _id: userId,
                id: userId,
                role,
            };

            if (!allowedRoles.includes(role)) {
                return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
            }

            return next();
        }

       const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!allowedRoles.includes(decoded.role)) {
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
