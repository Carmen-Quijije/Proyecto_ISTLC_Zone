package com.istlc.base_sql.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Notificacion;

public interface NotificacionRepository extends JpaRepository<Notificacion, Integer> {
}