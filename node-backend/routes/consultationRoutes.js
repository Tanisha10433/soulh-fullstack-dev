const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Consultation = require('../models/Consultation');
const ConsultationRequest = require('../models/ConsultationRequest');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');

const CONSULTATION_FEE = 499.0;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo';
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || 'demo_secret';

// Helper: send notification
const createAndSendNotification = async (userId, message, type, additional = {}) => {
  try {
    const notif = new Notification({
      user: userId,
      message,
      type
    });
    await notif.save();
    if (global.broadcastNotification) {
      global.broadcastNotification(userId.toString(), {
        ...notif.toJSON(),
        ...additional
      });
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

// 1. Browse Verified Doctors
router.get('/doctors/verified', authMiddleware, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'DOCTOR', isVerified: true });
    const result = doctors.map(d => ({
      id: d._id.toString(),
      name: d.name,
      specialization: d.illnessCondition || '',
      experience: d.experience || 0,
      qualification: d.qualification || '',
      hospital: d.hospital || '',
      isVerified: d.isVerified,
      fee: CONSULTATION_FEE
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/doctors/:id', authMiddleware, async (req, res) => {
  try {
    const d = await User.findById(req.params.id);
    if (!d || d.role !== 'DOCTOR') {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json({
      id: d._id.toString(),
      name: d.name,
      specialization: d.illnessCondition || '',
      experience: d.experience || 0,
      qualification: d.qualification || '',
      hospital: d.hospital || '',
      isVerified: d.isVerified,
      fee: CONSULTATION_FEE
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Availability Slots
router.post('/availability', authMiddleware, async (req, res) => {
  try {
    const doctor = req.user;
    if (doctor.role !== 'DOCTOR') {
      return res.status(400).json({ message: 'Only doctors can create slots' });
    }

    const { startTime, endTime } = req.body;

    const slot = new AvailabilitySlot({
      doctorId: doctor._id.toString(),
      startTime: new Date(startTime),
      endTime: new Date(endTime)
    });

    await slot.save();
    res.json({ message: 'Slot created', slotId: slot._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/availability/mine', authMiddleware, async (req, res) => {
  try {
    const slots = await AvailabilitySlot.find({ doctorId: req.user._id.toString() });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/availability/:doctorId', authMiddleware, async (req, res) => {
  try {
    const slots = await AvailabilitySlot.find({
      doctorId: req.params.doctorId,
      isBooked: false,
      startTime: { $gt: new Date() }
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/availability/:slotId', authMiddleware, async (req, res) => {
  try {
    const slot = await AvailabilitySlot.findById(req.params.slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (slot.doctorId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await AvailabilitySlot.findByIdAndDelete(req.params.slotId);
    res.json({ message: 'Slot deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Payment — Create Razorpay Order
router.post('/payment/create-order', authMiddleware, async (req, res) => {
  try {
    const mockOrderId = 'order_demo_' + uuidv4().replace(/-/g, '').substring(0, 16);
    res.json({
      orderId: mockOrderId,
      amount: parseInt(CONSULTATION_FEE * 100),
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      description: 'SoulH Consultation'
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment service unavailable' });
  }
});

// 4. Book Consultation
router.post('/consultations/book', authMiddleware, async (req, res) => {
  try {
    const patient = req.user;
    const { slotId, doctorId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    // Verify signature if not using test credentials
    if (RAZORPAY_KEY_ID !== 'rzp_test_demo' && RAZORPAY_SECRET !== 'demo_secret') {
      if (!razorpaySignature) {
        return res.status(400).json({ message: 'Payment signature is required' });
      }
      const generatedSig = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(razorpayOrderId + '|' + razorpayPaymentId)
        .digest('hex');

      if (generatedSig !== razorpaySignature) {
        return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
      }
    }

    const slot = await AvailabilitySlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    if (slot.isBooked) {
      return res.status(400).json({ message: 'Slot already booked' });
    }

    slot.isBooked = true;
    await slot.save();

    const consultationId = uuidv4().replace(/-/g, '').substring(0, 12);
    const meetingUrl = 'https://meet.jit.si/soulh-' + consultationId;

    const consultation = new Consultation({
      patientId: patient._id.toString(),
      doctorId,
      slotId,
      status: 'CONFIRMED',
      meetingUrl,
      razorpayOrderId,
      razorpayPaymentId,
      amountPaid: CONSULTATION_FEE,
      scheduledAt: slot.startTime
    });

    await consultation.save();

    // WS notifications
    await createAndSendNotification(
      doctorId,
      `New consultation booked by ${patient.name || patient.email.split('@')[0]}`,
      'NEW_CONSULTATION',
      { consultationId: consultation._id.toString() }
    );

    await createAndSendNotification(
      patient._id,
      `Your consultation is confirmed! Join at: ${meetingUrl}`,
      'CONSULTATION_CONFIRMED',
      { consultationId: consultation._id.toString() }
    );

    res.json({
      message: 'Consultation confirmed!',
      meetingUrl,
      scheduledAt: slot.startTime.toISOString(),
      consultationId: consultation._id.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request consultation (without slot / custom request)
router.post('/consultations/request', authMiddleware, async (req, res) => {
  try {
    const patient = req.user;
    const { doctorId, condition, slotId, scheduledTime } = req.body;

    let scheduledDate;
    if (slotId) {
      const slot = await AvailabilitySlot.findById(slotId);
      scheduledDate = slot ? slot.startTime : new Date();
    } else if (scheduledTime) {
      scheduledDate = new Date(scheduledTime);
    } else {
      scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const request = new ConsultationRequest({
      patientId: patient._id.toString(),
      doctorId,
      condition,
      status: 'PENDING',
      scheduledTime: scheduledDate
    });

    await request.save();

    await createAndSendNotification(
      doctorId,
      `New consultation request from ${patient.name || patient.email.split('@')[0]}`,
      'NEW_CONSULTATION_REQUEST',
      { requestId: request._id.toString() }
    );

    res.json({ message: 'Request sent to doctor', requestId: request._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. List My Consultations
router.get('/consultations/my', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let query = {};
    if (user.role === 'DOCTOR') {
      query.doctorId = user._id.toString();
    } else {
      query.patientId = user._id.toString();
    }

    const consultations = await Consultation.find(query).sort({ createdAt: -1 });

    const result = [];
    for (const c of consultations) {
      const m = {
        id: c._id.toString(),
        status: c.status,
        meetingUrl: c.meetingUrl || '',
        amountPaid: c.amountPaid || 0,
        scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : '',
        createdAt: c.createdAt ? c.createdAt.toISOString() : '',
        doctorId: c.doctorId,
        patientId: c.patientId,
        doctorSummary: c.doctorSummary
      };

      try {
        const doctor = await User.findById(c.doctorId);
        if (doctor) {
          m.doctorName = doctor.name || doctor.email.split('@')[0];
          m.doctorSpecialization = doctor.illnessCondition || '';
        }
      } catch (e) {}

      try {
        const patient = await User.findById(c.patientId);
        if (patient) {
          m.patientName = patient.name || patient.email.split('@')[0];
          m.patientIllness = patient.illnessCondition || '';
        }
      } catch (e) {}

      result.push(m);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Cancel Consultation
router.patch('/consultations/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const c = await Consultation.findById(req.params.id);
    if (!c) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (c.patientId !== req.user._id.toString() && c.doctorId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    c.status = 'CANCELLED';
    await c.save();

    // Free the slot
    if (c.slotId) {
      const slot = await AvailabilitySlot.findById(c.slotId);
      if (slot) {
        slot.isBooked = false;
        await slot.save();
      }
    }

    res.json({ message: 'Consultation cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Doctor writes consultation summary
router.put('/consultations/:id/summary', authMiddleware, async (req, res) => {
  try {
    const c = await Consultation.findById(req.params.id);
    if (!c) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (c.doctorId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the consulting doctor can write summary' });
    }

    c.doctorSummary = req.body.summary;
    c.status = 'COMPLETED';
    await c.save();

    await createAndSendNotification(
      c.patientId,
      'Your doctor has written a consultation summary. View it in My Consultations.',
      'SUMMARY_READY',
      { consultationId: c._id.toString() }
    );

    res.json({ message: 'Summary saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
