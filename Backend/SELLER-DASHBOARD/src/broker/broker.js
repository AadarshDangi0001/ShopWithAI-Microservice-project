import amqplib from "amqplib";

let connection;
let channel;

export async function connect() {
    connection = await amqplib.connect(process.env.RABBIT_URL);
    channel = await connection.createChannel();
    console.log("Connected to RabbitMQ");
}

export async function subscribeToQueue(queueName, callback) {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized. Call connect() first.");
    }

    await channel.assertQueue(queueName, { durable: true });

    channel.consume(queueName, async (msg) => {
        if (msg) {
            try {
                const data = JSON.parse(msg.content.toString());
                await callback(data);
                channel.ack(msg);
            } catch (error) {
                console.error(`Error processing message from ${queueName}:`, error);
                channel.nack(msg, false, true);
            }
        }
    });

    console.log(`Subscribed to queue: ${queueName}`);
}

export async function publishToQueue(queueName, data) {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized. Call connect() first.");
    }

    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true });
}