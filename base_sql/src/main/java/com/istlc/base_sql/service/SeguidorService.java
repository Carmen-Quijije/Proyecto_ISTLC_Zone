package com.istlc.base_sql.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.istlc.base_sql.entity.Seguidor;
import com.istlc.base_sql.repository.SeguidorRepository;

@Service
public class SeguidorService {

    private final SeguidorRepository seguidorRepository;

    public SeguidorService(SeguidorRepository seguidorRepository) {
        this.seguidorRepository = seguidorRepository;
    }

    public List<Seguidor> obtenerSeguidos(Integer idUsuario) {
        return seguidorRepository.findByUsuario_IdUsuario(idUsuario);
    }

    public List<Seguidor> obtenerSeguidores(Integer idUsuario) {
        return seguidorRepository.findByUsuarioSeguido_IdUsuario(idUsuario);
    }
}