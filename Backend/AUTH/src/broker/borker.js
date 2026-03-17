import amqplib from 'amqplib';


let channel;
let connection;
let isConnecting = false;

function resetBrokerState() {
    channel = null;
    connection = null;
    isConnecting = false;
}

function attachConnectionListeners(conn) {
    conn.on('error', (error) => {
        console.error('RabbitMQ connection error:', error?.message || error);
    });

    conn.on('close', () => {
        console.warn('RabbitMQ connection closed');
        resetBrokerState();
    });
}

function attachChannelListeners(ch) {
    ch.on('error', (error) => {
        console.error('RabbitMQ channel error:', error?.message || error);
    });

    ch.on('close', () => {
        console.warn('RabbitMQ channel closed');
        channel = null;
    });
}

async function connect() {

    if (connection) return connection;
    if (isConnecting) return null;

    try {
        isConnecting = true;
        connection = await amqplib.connect(process.env.RABBIT_URL);
        attachConnectionListeners(connection);
        console.log('Connected to RabbitMQ');

        channel = await connection.createChannel();
        attachChannelListeners(channel);

        return connection;
    }
    catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        resetBrokerState();
        return null;
    } finally {
        isConnecting = false;
    }
 
}


async function publishToQueue(queueName, data = {}) {
    try {
        if (!channel || !connection) await connect();
        if (!channel) {
            console.warn(`RabbitMQ unavailable. Skipping publish for ${queueName}`);
            return false;
        }

        await channel.assertQueue(queueName, {
            durable: true
        });

        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
        console.log('Message sent to queue:', queueName, data);
        return true;
    } catch (error) {
        console.error(`Error publishing message to ${queueName}:`, error?.message || error);
        return false;
    }
}


async function subscribeToQueue(queueName, callback) {

    if (!channel || !connection) await connect();
    if (!channel) {
        console.warn(`RabbitMQ unavailable. Cannot subscribe to ${queueName}`);
        return;
    }

    await channel.assertQueue(queueName, {
        durable: true
    });

    channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const data = JSON.parse(msg.content.toString());
            await callback(data);
            channel.ack(msg);
        }
    })

}


export {
    connect,
    channel,
    connection,
    publishToQueue,
    subscribeToQueue

};