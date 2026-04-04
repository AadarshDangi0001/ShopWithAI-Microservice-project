import amqplib from 'amqplib';


let channel;
let connection;

async function connect() {

    if (connection) return connection;

    try {
        connection = await amqplib.connect(process.env.RABBIT_URL);
        console.log('Connected to RabbitMQ');

        connection.on('error', (error) => {
            console.error('RabbitMQ connection error:', error.message);
        });

        connection.on('close', () => {
            console.warn('RabbitMQ connection closed');
            connection = null;
            channel = null;
        });

        channel = await connection.createChannel();

        channel.on('error', (error) => {
            console.error('RabbitMQ channel error:', error.message);
        });

        channel.on('close', () => {
            console.warn('RabbitMQ channel closed');
            channel = null;
        });
    }
    catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        connection = null;
        channel = null;
    }
 
}


async function publishToQueue(queueName, data = {}) {
    if (!channel || !connection) await connect();

    if (!channel) {
        console.warn('Skipping publish because RabbitMQ channel is unavailable');
        return;
    }

    await channel.assertQueue(queueName, {
        durable: true
    });

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
    console.log('Message sent to queue:', queueName, data);
}


async function subscribeToQueue(queueName, callback) {

    if (!channel || !connection) await connect();

    if (!channel) {
        console.warn('Skipping subscribe because RabbitMQ channel is unavailable');
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