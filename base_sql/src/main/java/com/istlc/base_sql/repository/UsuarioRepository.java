package com.istlc.base_sql.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.istlc.base_sql.entity.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Usuario findByCorreo(String correo);

}