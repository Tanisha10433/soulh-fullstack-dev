package com.soulh.config;

import com.soulh.model.User;
import com.soulh.repository.PostRepository;
import com.soulh.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
@RequiredArgsConstructor
@Slf4j
public class CommunityPostCleanup implements ApplicationRunner {

    private static final String MIGRATION_ID = "remove-tanisha-jinga-jinga-community-posts-v1";
    private static final String TARGET_NAME_REGEX = "(?i)^tanisha[\\s_]+jinga[\\s_]+jinga$";

    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;
    private final PostRepository postRepository;

    @Override
    public void run(ApplicationArguments args) {
        Query migrationQuery = Query.query(Criteria.where("_id").is(MIGRATION_ID));
        if (mongoTemplate.exists(migrationQuery, "data_migrations")) {
            return;
        }

        List<User> matchingUsers = userRepository.findByNameRegex(TARGET_NAME_REGEX);
        if (matchingUsers.size() != 1) {
            log.warn("Skipping community post cleanup: expected one exact target account, found {}.",
                    matchingUsers.size());
            return;
        }

        User target = matchingUsers.get(0);
        postRepository.deleteByAuthorId(target.getId());
        mongoTemplate.insert(new Document("_id", MIGRATION_ID)
                .append("completedAt", Instant.now().toString()), "data_migrations");
        log.info("Removed existing community posts for the exact target account; account data was retained.");
    }
}
