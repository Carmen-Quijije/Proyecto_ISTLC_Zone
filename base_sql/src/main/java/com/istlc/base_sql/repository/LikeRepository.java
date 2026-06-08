package com.istlc.base_sql.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Like;

public interface LikeRepository extends JpaRepository<Like, Integer> {
}