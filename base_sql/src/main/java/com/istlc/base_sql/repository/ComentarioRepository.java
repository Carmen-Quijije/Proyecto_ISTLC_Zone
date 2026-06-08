package com.istlc.base_sql.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Comentario;

public interface ComentarioRepository extends JpaRepository<Comentario, Integer> {
}