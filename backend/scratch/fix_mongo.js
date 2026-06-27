const { MongoClient } = require('mongodb');

const uri = 'mongodb://mongo:amIBJrdybhxmABiZXSCCUxMevaxYLzzm@zephyr.proxy.rlwy.net:33809/?authSource=admin';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB successfully!');
        const adminDb = client.db('admin');
        const result = await adminDb.command({ setParameter: 1, minFreeDiskSpaceInBytes: 10485760 });
        console.log('Command result:', result);
    } catch (e) {
        console.error('Error executing command:', e);
    } finally {
        await client.close();
    }
}

main();
