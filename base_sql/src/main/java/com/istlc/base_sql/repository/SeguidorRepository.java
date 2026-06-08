package com.istlc.base_sql.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Seguidor;

public interface SeguidorRepository extends JpaRepository<Seguidor, Integer> {
}