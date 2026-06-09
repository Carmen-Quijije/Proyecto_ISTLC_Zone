package com.istlc.base_sql.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.istlc.base_sql.entity.Usuario;
import com.istlc.base_sql.repository.UsuarioRepository;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario registrar(Usuario usuario) {
        Usuario existe = usuarioRepository.findByCorreo(usuario.getCorreo());

        if (existe != null) {
            throw new RuntimeException("El correo ya está registrado");
        }

        usuario.setFechaRegistro(LocalDateTime.now());
        return usuarioRepository.save(usuario);
    }

    public Usuario login(String correo, String contrasena) {
        Usuario usuario = usuarioRepository.findByCorreo(correo);

        if (usuario == null) {
            throw new RuntimeException("Usuario no encontrado");
        }

        if (!usuario.getContrasena().equals(contrasena)) {
            throw new RuntimeException("Contraseña incorrecta");
        }

        return usuario;
    }

    public List<Usuario> listarUsuarios() {
        return usuarioRepository.findAll();
    }

    public Usuario actualizarUsuario(Integer id, Usuario datosActualizados) {

        Usuario usuario = usuarioRepository.findById(id).orElse(null);

        if (usuario != null) {
            usuario.setNombreCompleto(datosActualizados.getNombreCompleto());
            usuario.setViveEn(datosActualizados.getViveEn());
            usuario.setLugarOrigen(datosActualizados.getLugarOrigen());
            usuario.setFechaNacimiento(datosActualizados.getFechaNacimiento());
            usuario.setEstadoCivil(datosActualizados.getEstadoCivil());
            usuario.setCarrera(datosActualizados.getCarrera());
            usuario.setSemestre(datosActualizados.getSemestre());
            usuario.setGenero(datosActualizados.getGenero());

            return usuarioRepository.save(usuario);
        }

        return null;
    }
}
