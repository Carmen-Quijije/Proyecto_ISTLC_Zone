package com.istlc.base_sql.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.istlc.base_sql.entity.Seguidor;
import com.istlc.base_sql.service.SeguidorService;

@RestController
@RequestMapping("/api/seguidores")
@CrossOrigin(origins = "*")
public class SeguidorController {

    private final SeguidorService seguidorService;

    public SeguidorController(SeguidorService seguidorService) {
        this.seguidorService = seguidorService;
    }

    @GetMapping("/seguidos/{idUsuario}")
    public List<Seguidor> obtenerSeguidos(@PathVariable Integer idUsuario) {
        return seguidorService.obtenerSeguidos(idUsuario);
    }

    @GetMapping("/seguidores/{idUsuario}")
    public List<Seguidor> obtenerSeguidores(@PathVariable Integer idUsuario) {
        return seguidorService.obtenerSeguidores(idUsuario);
    }
}