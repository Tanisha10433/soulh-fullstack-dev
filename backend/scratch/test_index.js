const { MongoClient } = require('mongodb');

const uri = 'mongodb://mongo:amIBJrdybhxmABiZXSCCUxMevaxYLzzm@zephyr.proxy.rlwy.net:33809/?authSource=admin';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB successfully!');
        const db = client.db('soulh_db');
        
        // Create indexes on 'user' collection
        const userCollection = db.collection('user');
        console.log('Creating index on user (email)...');
        const userRes = await userCollection.createIndex({ email: 1 }, { unique: true });
        console.log('User index created:', userRes);

        // Create indexes on 'message' collection
        const messageCollection = db.collection('message');
        console.log('Creating indexes on message...');
        const msgRes1 = await messageCollection.createIndex({ senderId: 1 });
        const msgRes2 = await messageCollection.createIndex({ receiverId: 1 });
        const msgRes3 = await messageCollection.createIndex({ sentAt: 1 });
        console.log('Message indexes created:', msgRes1, msgRes2, msgRes3);

    } catch (e) {
        console.error('Error creating indexes:', e);
    } finally {
        await client.close();
    }
}

main();
