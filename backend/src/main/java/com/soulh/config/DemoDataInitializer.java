package com.soulh.config;

import com.soulh.model.*;
import com.soulh.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * DemoDataInitializer — Seeds realistic demo users, doctors, connections,
 * and chat messages on startup so the app is ready to demo immediately.
 *
 * All demo accounts use password: Demo@1234
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DemoDataInitializer implements ApplicationRunner {

    private final UserRepository userRepo;
    private final ConnectionRequestRepository connectionRepo;
    private final MessageRepository messageRepo;
    private final DoctorVerificationRepository verificationRepo;
    private final com.soulh.repository.PatientVerificationRepository patientVerificationRepo;
    private final com.soulh.repository.CommunityRepository communityRepo;
    private final com.soulh.repository.PostRepository postRepo;
    private final com.soulh.repository.CommentRepository commentRepo;
    private final com.soulh.repository.ConsultationRepository consultationRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Seed demo users and initial data
        seedDemoData();
    }

    private void seedDemoData() {
        String testEmail = "test@test.com";
        String pass = passwordEncoder.encode("password");

        // Check if Test User exists, if not create it
        User testUser = userRepo.findByEmail(testEmail).orElseGet(() -> {
            log.info("Creating permanent Test User...");
            return userRepo.save(User.builder()
                    .name("Test User").email(testEmail).password(pass)
                    .role(Role.USER).illnessCondition("Anxiety")
                    .isPublicProfile(true).isVerified(true).build());
        });

        // Force update the demo doctor if they exist to ensure profile fields are populated
        userRepo.findByEmail("doctor@soulh.com").ifPresent(doc -> {
            boolean changed = false;
            if (doc.getBio() == null || doc.getBio().isEmpty()) {
                doc.setBio("Dr. Fatima Ali is a chronic illness specialist focusing on endometriosis, pelvic pain, and women's health. She has helped hundreds of patients manage long-term conditions with personalized care.");
                changed = true;
            }
            if (doc.getExpertiseAreas() == null || doc.getExpertiseAreas().isEmpty()) {
                doc.setExpertiseAreas(List.of("Endometriosis management", "Chronic pelvic pain", "PCOS", "Hormonal disorders"));
                changed = true;
            }
            if (doc.getAwards() == null || doc.getAwards().isEmpty()) {
                doc.setAwards(List.of("Best Gynecologist Award – 2021", "Excellence in Women’s Health – 2020"));
                changed = true;
            }
            if (doc.getPublications() == null || doc.getPublications().isEmpty()) {
                doc.setPublications(List.of("“Advances in Endometriosis Treatment” – 2022", "“Chronic Pelvic Pain Management” – 2021"));
                changed = true;
            }
            if (changed) {
                userRepo.save(doc);
                log.info("Force-updated demo doctor profile fields.");
            }
        });

        // Only seed the rest if DB is empty (besides the test user)
        if (userRepo.count() > 1 && userRepo.findByEmail("priya@soulh.demo").isPresent()) {
            log.info("Demo data already present — skipping rest of seed.");
            ensureTestUserConnections(testUser);
            return;
        }

        log.info("🌱 Seeding full demo dataset...");
        String demoPass = passwordEncoder.encode("Demo@1234");

        // ── Users ───────────────────────────────────────────────────
        User priya = userRepo.save(User.builder()
                .name("Priya Sharma").email("priya@soulh.demo").password(pass)
                .role(Role.USER).illnessCondition("Anxiety and Depression")
                .isPublicProfile(true).isVerified(false).build());

        User aisha = userRepo.save(User.builder()
                .name("Aisha Khan").email("aisha@soulh.demo").password(pass)
                .role(Role.USER).illnessCondition("PCOS and Anxiety")
                .isPublicProfile(true).isVerified(false).build());

        User rahul = userRepo.save(User.builder()
                .name("Rahul Gupta").email("rahul@soulh.demo").password(pass)
                .role(Role.USER).illnessCondition("Type 2 Diabetes")
                .isPublicProfile(true).isVerified(false).build());

        User vikram = userRepo.save(User.builder()
                .name("Vikram Mehta").email("vikram@soulh.demo").password(pass)
                .role(Role.USER).illnessCondition("Chronic Fatigue Syndrome")
                .isPublicProfile(true).isVerified(false).build());

        User neha = userRepo.save(User.builder()
                .name("Neha Patel").email("neha@soulh.demo").password(pass)
                .role(Role.USER).illnessCondition("Lupus")
                .isPublicProfile(true).isVerified(false).build());

        // ── Doctors ─────────────────────────────────────────────────
        User drArjun = userRepo.save(User.builder()
                .name("Dr. Arjun Sharma").email("dr.arjun@soulh.demo").password(pass)
                .role(Role.DOCTOR).illnessCondition("Chronic Pain and Rheumatology")
                .experience(12).qualification("MBBS, MD (General Medicine), Fellowship in Pain Management")
                .hospital("Jaslok Hospital, Mumbai")
                .bio("Dedicated to helping patients manage chronic invisible illnesses through a holistic approach combining medicine and lifestyle changes.")
                .expertiseAreas(List.of("Fibromyalgia", "Chronic Fatigue", "Lupus Management", "Mental Wellness"))
                .awards(List.of("Best Rheumatologist 2024", "Excellence in Patient Care"))
                .publications(List.of("Managing Chronic Pain in the 21st Century", "The Gut-Brain Connection in Inflammation"))
                .isPublicProfile(true).isVerified(true).build()); // already verified

        User drFatima = userRepo.save(User.builder()
                .name("Dr. Fatima Ali").email("dr.fatima@soulh.demo").password(pass)
                .role(Role.DOCTOR).illnessCondition("Endometriosis Specialist")
                .experience(12).qualification("MBBS, MD (Gynecology)")
                .hospital("Apollo Hospitals")
                .bio("Dr. Fatima Ali is a chronic illness specialist focusing on endometriosis, pelvic pain, and women's health. She has helped hundreds of patients manage long-term conditions with personalized care.")
                .expertiseAreas(List.of("Endometriosis management", "Chronic pelvic pain", "PCOS", "Hormonal disorders"))
                .awards(List.of("Best Gynecologist Award – 2021", "Excellence in Women’s Health – 2020"))
                .publications(List.of("“Advances in Endometriosis Treatment” – 2022", "“Chronic Pelvic Pain Management” – 2021"))
                .isPublicProfile(true).isVerified(true).build());

        // Requested specific demo doctor
        userRepo.save(User.builder()
                .name("Dr. Fatima Ali").email("doctor@soulh.com").password(passwordEncoder.encode("123456"))
                .role(Role.DOCTOR).illnessCondition("Endometriosis Specialist")
                .experience(12).qualification("MBBS, MD (Gynecology)")
                .hospital("Apollo Hospitals")
                .bio("Dr. Fatima Ali is a chronic illness specialist focusing on endometriosis, pelvic pain, and women's health. She has helped hundreds of patients manage long-term conditions with personalized care.")
                .expertiseAreas(List.of("Endometriosis management", "Chronic pelvic pain", "PCOS", "Hormonal disorders"))
                .awards(List.of("Best Gynecologist Award – 2021", "Excellence in Women’s Health – 2020"))
                .publications(List.of("“Advances in Endometriosis Treatment” – 2022", "“Chronic Pelvic Pain Management” – 2021"))
                .isPublicProfile(true).isVerified(true).build());

        // ── Admins ──────────────────────────────────────────────────
        User admin = userRepo.save(User.builder()
                .name("SoulH Admin").email("admin@soulh.demo").password(pass)
                .role(Role.ADMIN).illnessCondition(null)
                .isPublicProfile(false).isVerified(true).build());

        // ── Dataset Dummy Doctors (Kaggle Integration) ──────────────
        User drJohn = userRepo.save(User.builder()
                .name("Dr. John Anderson").email("j.anderson@soulh.demo").password(pass)
                .role(Role.DOCTOR).illnessCondition("Neurology")
                .experience(15).qualification("MD, DM Neurology").hospital("Apollo General")
                .isPublicProfile(true).isVerified(true).build());

        User drSarah = userRepo.save(User.builder()
                .name("Dr. Sarah Jenkins").email("s.jenkins@soulh.demo").password(pass)
                .role(Role.DOCTOR).illnessCondition("Rheumatology")
                .experience(8).qualification("MBBS, MD").hospital("City Care Clinic")
                .isPublicProfile(true).isVerified(true).build());

        verificationRepo.save(DoctorVerification.builder().doctor(drJohn).registrationNumber("MED-1100").status(VerificationStatus.APPROVED).build());
        verificationRepo.save(DoctorVerification.builder().doctor(drSarah).registrationNumber("MED-1101").status(VerificationStatus.APPROVED).build());

        // ── Doctor Verifications ─────────────────────────────────────
        verificationRepo.save(DoctorVerification.builder()
                .doctor(drArjun)
                .registrationNumber("MCI-ARJUN-100")
                .status(VerificationStatus.APPROVED).build());

        verificationRepo.save(DoctorVerification.builder()
                .doctor(drFatima)
                .registrationNumber("MCI-FATIMA-200")
                .status(VerificationStatus.PENDING).build());

        // ── Patient Verifications ────────────────────────────────────
        patientVerificationRepo.save(com.soulh.model.PatientVerification.builder()
                .patient(priya)
                .proofUrl("https://dummyimage.com/600x800/0d6b5e/ffffff.png&text=Medical+Report+-+Priya")
                .status(VerificationStatus.PENDING).build());

        patientVerificationRepo.save(com.soulh.model.PatientVerification.builder()
                .patient(aisha)
                .proofUrl("https://dummyimage.com/600x800/dc2626/ffffff.png&text=PCOS+Ultrasound+-+Aisha")
                .status(VerificationStatus.PENDING).build());

        // ── Connections (Accepted) ───────────────────────────────────
        // Priya ↔ Aisha (both have anxiety — great demo)
        connectionRepo.save(ConnectionRequest.builder()
                .sender(priya).receiver(aisha)
                .status(RequestStatus.ACCEPTED).build());

        // Rahul ↔ Vikram
        connectionRepo.save(ConnectionRequest.builder()
                .sender(rahul).receiver(vikram)
                .status(RequestStatus.ACCEPTED).build());

        // Priya ↔ Neha (pending — to show requests tab)
        connectionRepo.save(ConnectionRequest.builder()
                .sender(neha).receiver(priya)
                .status(RequestStatus.PENDING).build());

        // ── Chat Messages between Priya & Aisha ─────────────────────
        List<Object[]> msgs = List.of(
            new Object[]{aisha, priya, "Hi Priya! I saw you also deal with anxiety. How long have you been managing it?"},
            new Object[]{priya, aisha, "Hey Aisha! Almost 3 years now. Some days are better than others 😊 You?"},
            new Object[]{aisha, priya, "Same here. The PCOS makes the anxiety so much worse during certain times of the month..."},
            new Object[]{priya, aisha, "Oh I completely understand! Hormones and anxiety are connected for so many of us."},
            new Object[]{aisha, priya, "Exactly! Have you tried any breathing exercises? I've been doing box breathing lately."},
            new Object[]{priya, aisha, "Yes! 4-7-8 breathing changed my life honestly. That + journaling. Highly recommend 💙"},
            new Object[]{aisha, priya, "I'll try that. Thanks for being so open about this, it really helps knowing someone understands."},
            new Object[]{priya, aisha, "Always here for you! That's what SoulH is for ✨"}
        );

        for (Object[] m : msgs) {
            Message message = Message.builder()
                    .senderId(((User) m[0]).getId())
                    .receiverId(((User) m[1]).getId())
                    .content((String) m[2])
                    .build();
            message.onSend();
            messageRepo.save(message);
        }

        // ── Chat Messages between Rahul & Vikram ────────────────────
        List<Object[]> msgs2 = List.of(
            new Object[]{rahul, vikram, "Hey Vikram! Fellow chronic illness warrior here 💪"},
            new Object[]{vikram, rahul, "Hey Rahul! Diabetes and CFS are both invisible illnesses — people don't get it unless they live it."},
            new Object[]{rahul, vikram, "True! How do you manage your energy levels?"},
            new Object[]{vikram, rahul, "Strict sleep schedule + pacing technique. Never overdo it even on good days. You?"},
            new Object[]{rahul, vikram, "Diet management mostly. Low carb keeps my levels stable. It's hard socially though."},
            new Object[]{vikram, rahul, "Totally. People always push food at you at events 😅 Glad I found someone who gets it."}
        );

        for (Object[] m : msgs2) {
            Message message = Message.builder()
                    .senderId(((User) m[0]).getId())
                    .receiverId(((User) m[1]).getId())
                    .content((String) m[2])
                    .build();
            message.onSend();
            messageRepo.save(message);
        }

        log.info("✅ Demo data seeded successfully!");

        // ── Default Community (required for Feed tab) ─────────────────
        Community general = communityRepo.save(Community.builder()
                .name("SoulH General")
                .description("A safe space for everyone living with a chronic illness.")
                .illnessCondition("General")
                .build());
        // join all users automatically
        if (general.getMembers() == null) {
            general.setMembers(new java.util.HashSet<>());
        }
        general.getMembers().add(priya); general.getMembers().add(aisha);
        general.getMembers().add(rahul); general.getMembers().add(vikram);
        general.getMembers().add(neha);
        communityRepo.save(general);

        // ── Seed demo posts ───────────────────────────────────────────
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        if (postRepo.count() < 4) {
            Post p1 = postRepo.save(Post.builder()
                    .communityId(general.getId())
                    .authorId(priya.getId()).isAnonymous(false)
                    .content("Just had my first anxiety-free week in months. Small wins matter! 💪")
                    .illnessTag("ANXIETY")
                    .createdAt(now.minusDays(2)).build());

            Post p2 = postRepo.save(Post.builder()
                    .communityId(general.getId())
                    .authorId(aisha.getId()).isAnonymous(true)
                    .content("Does anyone else find that stress makes their symptoms 10x worse? Feeling overwhelmed.")
                    .illnessTag("PAIN")
                    .createdAt(now.minusDays(1)).build());

            Post p3 = postRepo.save(Post.builder()
                    .communityId(general.getId())
                    .authorId(rahul.getId()).isAnonymous(false)
                    .content("Low carb meal prep Sunday 🥗 Keeping my blood sugar steady all week. Happy to share recipes!")
                    .illnessTag("DIABETES")
                    .createdAt(now.minusHours(5)).build());

            // ── Doctor Advice Post ──
            Post p4 = postRepo.save(Post.builder()
                    .communityId(general.getId())
                    .authorId(drArjun.getId()).isAnonymous(false)
                    .content("New research shows that gentle yoga can significantly reduce inflammation for patients with chronic pain. I've shared a full guide below.")
                    .illnessTag("RESOURCES")
                    .fileUrl("https://www.who.int/news-room/fact-sheets/detail/chronic-pain")
                    .createdAt(now.minusHours(1)).build());

            // ── Comments ──
            commentRepo.save(Comment.builder().postId(p1.getId()).author(aisha).content("So happy for you Priya! This gives me hope.").createdAt(now.minusDays(1)).build());
            commentRepo.save(Comment.builder().postId(p2.getId()).author(rahul).content("Pacing really helped me with my symptoms. Take it one step at a time.").createdAt(now.minusHours(12)).build());
            commentRepo.save(Comment.builder().postId(p4.getId()).author(testUser).content("Thank you Dr. Arjun! This research is very helpful.").createdAt(now.minusMinutes(30)).build());

            // ── Seed Demo Consultations ──
            consultationRepo.save(Consultation.builder()
                .patientId(priya.getId())
                .doctorId(drArjun.getId())
                .condition("Severe Anxiety and Insomnia")
                .status("CONFIRMED")
                .scheduledAt(now.plusDays(1))
                .createdAt(now.minusDays(1)).build());

            consultationRepo.save(Consultation.builder()
                .patientId(aisha.getId())
                .doctorId(drArjun.getId())
                .condition("PCOS related Fatigue")
                .status("PENDING")
                .scheduledAt(now.plusDays(2))
                .createdAt(now.minusHours(2)).build());
        }
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("Demo Accounts (password for all: Demo@1234)");
        log.info("  👤 test@test.com      — Permanent Test Account (password: password)");
        log.info("  👤 priya@soulh.demo   — User, Anxiety");
        log.info("  👤 aisha@soulh.demo   — User, PCOS");
        log.info("  👤 rahul@soulh.demo   — User, Diabetes");
        log.info("  👤 vikram@soulh.demo  — User, CFS");
        log.info("  👤 neha@soulh.demo    — User, Lupus");
        log.info("  👨‍⚕️ dr.arjun@soulh.demo — Doctor ✓ Verified");
        log.info("  👨‍⚕️ dr.fatima@soulh.demo — Doctor ⏳ Pending");
        log.info("  👑 admin@soulh.demo   — Admin");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        ensureTestUserConnections(testUser);
    }

    private void ensureTestUserConnections(User testUser) {
        User priya = userRepo.findByEmail("priya@soulh.demo").orElse(null);
        User aisha = userRepo.findByEmail("aisha@soulh.demo").orElse(null);

        if (priya != null) {
            boolean exists = connectionRepo.findBySenderAndReceiver(testUser, priya).isPresent() || 
                             connectionRepo.findBySenderAndReceiver(priya, testUser).isPresent();
            if (!exists) {
                connectionRepo.save(ConnectionRequest.builder().sender(testUser).receiver(priya).status(RequestStatus.ACCEPTED).build());
                log.info("Connected Test User with Priya");
                seedChat(testUser, priya, "Hey Priya! I saw your post about anxiety small wins. So inspiring!");
                seedChat(priya, testUser, "Aww thank you! It's been a journey. How are you feeling today?");
            }
        }
        if (aisha != null) {
            boolean exists = connectionRepo.findBySenderAndReceiver(testUser, aisha).isPresent() || 
                             connectionRepo.findBySenderAndReceiver(aisha, testUser).isPresent();
            if (!exists) {
                connectionRepo.save(ConnectionRequest.builder().sender(testUser).receiver(aisha).status(RequestStatus.ACCEPTED).build());
                log.info("Connected Test User with Aisha");
                seedChat(aisha, testUser, "Hi there! Welcome to SoulH. I saw we both manage anxiety.");
            }
        }
    }

    private void seedChat(User sender, User receiver, String content) {
        Message message = Message.builder()
                .senderId(sender.getId())
                .receiverId(receiver.getId())
                .content(content)
                .build();
        message.onSend();
        messageRepo.save(message);
    }
}
