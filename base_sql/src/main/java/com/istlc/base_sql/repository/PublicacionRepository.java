package com.istlc.base_sql.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Publicacion;

public interface PublicacionRepository extends JpaRepository<Publicacion, Integer> {
}