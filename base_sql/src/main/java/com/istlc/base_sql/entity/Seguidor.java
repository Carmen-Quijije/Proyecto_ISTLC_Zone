package com.istlc.base_sql.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "Seguidores")
public class Seguidor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdSeguimiento")
    private Integer idSeguimiento;

    @ManyToOne
    @JoinColumn(name = "IdUsuario")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "IdUsuarioSeguido")
    private Usuario usuarioSeguido;

    public Seguidor() {
    }

    public Integer getIdSeguimiento() {
        return idSeguimiento;
    }

    public void setIdSeguimiento(Integer idSeguimiento) {
        this.idSeguimiento = idSeguimiento;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public Usuario getUsuarioSeguido() {
        return usuarioSeguido;
    }

    public void setUsuarioSeguido(Usuario usuarioSeguido) {
        this.usuarioSeguido = usuarioSeguido;
    }
}