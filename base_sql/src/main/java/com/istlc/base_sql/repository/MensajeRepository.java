package com.istlc.base_sql.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Mensaje;

public interface MensajeRepository extends JpaRepository<Mensaje, Integer> {
}