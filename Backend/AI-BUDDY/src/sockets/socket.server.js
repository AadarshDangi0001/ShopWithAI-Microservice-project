import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { agent } from "../agent/agent.js";

async function initializeSocketServer(httpServer) {

    const socketPath = process.env.SOCKET_IO_PATH || "/socket.io/";
    console.log("[socket] Initializing Socket.IO server with path:", socketPath);

    const io = new Server(httpServer, {
        path: socketPath,
    })

    io.use((socket, next) => {

        const cookies = socket.handshake.headers?.cookie;
        const authHeader = socket.handshake.headers?.authorization;
        const authToken = socket.handshake.auth?.token || authHeader?.split(' ')[1];

        const { token: cookieToken } = cookies ? cookie.parse(cookies) : {};
        const token = cookieToken || authToken;

        if (!token) {
            console.warn("[socket][auth] Token not provided");
            return next(new Error('Token not provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            socket.user = decoded;
            socket.token = token;

            console.log("[socket][auth] Token verified for user:", decoded?.id || decoded?._id || decoded?.email);

            next()

        } catch (err) {
            console.error("[socket][auth] Invalid token:", err?.message || err);
            next(new Error('Invalid token'));
        }

    })

    io.on('connection', (socket) => {

        console.log("[socket] Client connected:", socket.id, "user:", socket.user);

        socket.onAny((eventName, payload) => {
            console.log("[socket] Incoming event:", eventName, "payload:", payload);
        });

        socket.on('disconnect', (reason) => {
            console.log("[socket] Client disconnected:", socket.id, "reason:", reason);
        });


        socket.on('message', async (data) => {
            try {
                console.log("[socket][message] Raw payload:", data);
                const userMessage = typeof data === 'string'
                    ? data.trim()
                    : (data?.message || data?.text || data?.content || '').toString().trim();
                console.log("[socket][message] Parsed message:", userMessage);
                if (!userMessage) {
                    const notice = 'Please send a valid message.';
                    console.warn("[socket][message] Empty/invalid payload. Sending notice.");
                    socket.emit('ai-response', { message: notice });
                    socket.emit('message', notice);
                    return;
                }

                console.log("[socket][message] Invoking agent for user:", socket.user?.id || socket.user?._id || socket.user?.email);
                const agentResponse = await agent.invoke({
                    messages: [
                        {
                            role: "user",
                            content: userMessage
                        }
                    ]
                }, {
                    metadata: {
                        token: socket.token
                    }
                })

                console.log("[socket][message] Agent invoke complete. Messages count:", agentResponse?.messages?.length || 0);

                const lastMessage = agentResponse.messages[ agentResponse.messages.length - 1 ]
                console.log("[socket][message] Last message type/content:", lastMessage?._getType?.(), lastMessage?.content);

                const output = Array.isArray(lastMessage?.content)
                    ? lastMessage.content.map((part) => part?.text || '').join(' ').trim()
                    : (lastMessage?.content || '').toString();

                const finalOutput = output || 'I could not generate a response right now.';
                console.log("[socket][message] Emitting response:", finalOutput);
                socket.emit('ai-response', { message: finalOutput });
                socket.emit('message', finalOutput);
            } catch (error) {
                console.error('AI-BUDDY message handling error:', error?.stack || error);
                const fallback = 'Sorry, something went wrong while processing your request.';
                socket.emit('ai-response', { message: fallback });
                socket.emit('message', fallback);
            }

        })

    })

}

export default initializeSocketServer;