const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function test() {
    console.log('Starting end-to-end verification...');
    
    // 1. Login as Priya
    let priyaToken;
    let priyaId;
    try {
        const res = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'priya@soulh.demo',
            password: 'password'
        });
        priyaToken = res.data.token;
        priyaId = res.data.id;
        console.log('✓ Logged in as Priya. ID:', priyaId);
    } catch (e) {
        console.error('✗ Failed to login as Priya:', e.message);
        return;
    }

    // 2. Login as Dr. Sarah Jenkins
    let sarahToken;
    let sarahId;
    try {
        const res = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 's.jenkins@soulh.demo',
            password: 'password'
        });
        sarahToken = res.data.token;
        sarahId = res.data.id;
        console.log('✓ Logged in as Dr. Sarah. ID:', sarahId);
    } catch (e) {
        console.error('✗ Failed to login as Dr. Sarah:', e.message);
        return;
    }

    const priyaHeaders = { headers: { Authorization: `Bearer ${priyaToken}` } };
    const sarahHeaders = { headers: { Authorization: `Bearer ${sarahToken}` } };

    // 3. Check connection status before consultation (should be false)
    try {
        const res = await axios.get(`${BASE_URL}/api/connections/status/${sarahId}`, priyaHeaders);
        console.log('✓ Checked connection status before booking (Priya -> Dr. Sarah):', res.data);
    } catch (e) {
        console.error('✗ Failed to check status:', e.message);
    }

    // 4. Send consultation request from Priya to Dr. Sarah
    let requestId;
    try {
        const res = await axios.post(`${BASE_URL}/api/consultations/request`, {
            doctorId: sarahId,
            condition: 'Stress Management',
            scheduledTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        }, priyaHeaders);
        requestId = res.data.requestId;
        console.log('✓ Sent consultation request from Priya to Dr. Sarah. Request ID:', requestId);
    } catch (e) {
        console.error('✗ Failed to send consultation request:', e.message);
        return;
    }

    // 5. Accept request as Dr. Sarah Jenkins
    try {
        const res = await axios.post(`${BASE_URL}/api/doctor/requests/${requestId}/accept`, {}, sarahHeaders);
        console.log('✓ Consultation request accepted by Dr. Sarah. Result:', res.data);
    } catch (e) {
        console.error('✗ Failed to accept request:', e.message);
        return;
    }

    // 6. Check connection status after accepted consultation (should be true!)
    try {
        const res = await axios.get(`${BASE_URL}/api/connections/status/${sarahId}`, priyaHeaders);
        console.log('✓ Checked connection status after booking (Priya -> Dr. Sarah):', res.data);
        if (res.data.connected === true) {
            console.log('🎉 CONNECTION SUCCESSFULLY VERIFIED! Messaging channel is now open.');
        } else {
            console.error('✗ Validation failed: connected should be true.');
        }
    } catch (e) {
        console.error('✗ Failed to check status after booking:', e.message);
    }
}

test();
