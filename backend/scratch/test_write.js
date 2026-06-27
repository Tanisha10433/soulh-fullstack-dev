const { MongoClient } = require('mongodb');

const uri = 'mongodb://mongo:amIBJrdybhxmABiZXSCCUxMevaxYLzzm@zephyr.proxy.rlwy.net:33809/?authSource=admin';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB successfully!');
        const db = client.db('soulh_db');
        const coll = db.collection('test_write');
        const res = await coll.insertOne({ test: true, time: new Date() });
        console.log('Insert result:', res);
        await coll.deleteOne({ _id: res.insertedId });
        console.log('Cleanup successful!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.close();
    }
}

main();
