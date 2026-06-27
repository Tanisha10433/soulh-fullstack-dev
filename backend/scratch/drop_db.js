const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to local MongoDB successfully!');
        const db = client.db('soulh_db');
        console.log('Dropping local database soulh_db...');
        await db.dropDatabase();
        console.log('Database dropped successfully!');
    } catch (e) {
        console.error('Error dropping database:', e);
    } finally {
        await client.close();
    }
}

main();
