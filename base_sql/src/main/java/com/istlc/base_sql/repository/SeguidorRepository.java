package com.istlc.base_sql.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Seguidor;

public interface SeguidorRepository extends JpaRepository<Seguidor, Integer> {

    List<Seguidor> findByUsuario_IdUsuario(Integer idUsuario);

    List<Seguidor> findByUsuarioSeguido_IdUsuario(Integer idUsuario);

}