package com.soulh.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class RateLimitService {

    private final Map<String, Long> lastAttempt = new ConcurrentHashMap<>();
    private static final long COOLDOWN_MS = 2000; // 2 seconds between auth attempts

    public boolean isAllowed(String ip) {
        long now = System.currentTimeMillis();
        Long last = lastAttempt.get(ip);
        if (last != null && (now - last) < COOLDOWN_MS) {
            return false;
        }
        lastAttempt.put(ip, now);
        return true;
    }

    // Cleanup old entries periodically if needed
    public void cleanup() {
        long now = System.currentTimeMillis();
        lastAttempt.entrySet().removeIf(entry -> (now - entry.getValue()) > TimeUnit.HOURS.toMillis(1));
    }
}
