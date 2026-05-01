package com.soulh.repository;

import com.soulh.model.DoctorContent;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DoctorContentRepository extends MongoRepository<DoctorContent, String> {
    List<DoctorContent> findByDoctorId(String doctorId);
    List<DoctorContent> findByType(String type);
}
