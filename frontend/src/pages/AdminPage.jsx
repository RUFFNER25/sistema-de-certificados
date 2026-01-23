import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

export default function AdminPage() {
  const [resultados, setResultados] = useState([])
  const [form, setForm] = useState({ nombre: '', dni: '', archivo: null })
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('')
  const { token, logout } = useAuth()

  const cargarCertificados = async (q = '') => {
    try {
      const url = q 
        ? `${API_BASE}/api/certificados?q=${encodeURIComponent(q)}` 
        : `${API_BASE}/api/certificados`
      const resp = await fetch(url)
      if (resp.ok) {
        const data = await resp.json()
        setResultados(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    cargarCertificados()
  }, [])

  const handleFiltroChange = (e) => {
    const val = e.target.value
    setFiltro(val)
    cargarCertificados(val)
  }

  const manejarCambioArchivo = (e) => {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, archivo: file }))
  }

  const manejarSubmit = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')

    if (!form.nombre || !form.dni || !form.archivo) {
      setError('Todos los campos son obligatorios (Nombre, DNI, PDF)')
      return
    }

    const formData = new FormData()
    formData.append('nombre', form.nombre)
    formData.append('dni', form.dni)
    formData.append('archivo', form.archivo)

    setSubiendo(true)
    try {
      const resp = await fetch(`${API_BASE}/api/certificados`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      })
      
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error || 'Error al subir certificado')
      }

      setMensaje('Certificado creado exitosamente.')
      setForm({ nombre: '', dni: '', archivo: null })
      // Reset input file manually if needed, or rely on key reset. 
      // Simple way: clear the input value by id or just let react state handle it if it was controlled (file input is tricky).
      document.getElementById('fileInput').value = ''
      
      cargarCertificados(filtro)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="app app-admin">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">
            <div className="admin-logo">SI</div>
            <div>
              <div className="admin-brand-name">SITech</div>
              <div className="admin-brand-role">Admin Panel</div>
            </div>
          </div>
          <nav className="admin-menu">
            <button className="admin-menu-item active">Certificados</button>
            <button className="admin-menu-item" onClick={logout}>Cerrar Sesión</button>
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-link">
            <span>←</span> Volver al sitio público
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Gestión de Certificados</h1>
          <p>Sube nuevos certificados o administra los existentes.</p>
        </header>

        <div className="admin-content">
          <div className="admin-list">
            <div className="admin-list-header">
              <h2>Listado de Certificados</h2>
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="Buscar por nombre o DNI..."
                  value={filtro}
                  onChange={handleFiltroChange}
                />
              </div>
            </div>

            {resultados.length === 0 ? (
              <p className="public-no-results" style={{textAlign:'center'}}>No se encontraron certificados.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>DNI</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td>
                      <td>{c.dni}</td>
                      <td>{new Date(c.creado_en).toLocaleDateString()}</td>
                      <td>
                        <a href={`${API_BASE}${c.url}`} target="_blank" rel="noreferrer">
                          Ver PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="admin-form">
            <h2>Nuevo Certificado</h2>
            <form className="form" onSubmit={manejarSubmit}>
              <label>
                Nombre Completo
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Juan Perez"
                />
              </label>
              <label>
                DNI / Documento
                <input
                  type="text"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                  placeholder="Ej: 12345678"
                />
              </label>
              <label>
                Archivo PDF
                <input 
                  id="fileInput"
                  type="file" 
                  accept="application/pdf" 
                  onChange={manejarCambioArchivo} 
                />
              </label>

              <button type="submit" disabled={subiendo}>
                {subiendo ? 'Subiendo...' : 'Guardar Certificado'}
              </button>
              
              {mensaje && <div className="ok">{mensaje}</div>}
              {error && <div className="error">{error}</div>}
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
