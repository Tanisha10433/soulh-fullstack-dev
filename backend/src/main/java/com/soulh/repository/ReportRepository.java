package com.soulh.repository;

import com.soulh.model.Report;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends org.springframework.data.mongodb.repository.MongoRepository<Report, String> {
    List<Report> findByResolvedFalseOrderByCreatedAtDesc();
}
