import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

export default function AdminPage() {
  const [resultados, setResultados] = useState([])
  const [form, setForm] = useState({ 
    nombre: '', 
    dni: '', 
    tipo: '',
    codigo: '',
    certificado_nombre: '',
    duracion: '',
    fecha_emision: '',
    fecha_caducidad: '',
    archivo: null 
  })
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

  const manejarCambioDNI = (e) => {
    const valor = e.target.value
    // Solo permitir números
    if (valor === '' || /^\d+$/.test(valor)) {
      setForm((prev) => ({ ...prev, dni: valor }))
    }
  }

  const manejarCambioCampo = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }))
  }

  const manejarSubmit = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')

    if (!form.nombre || !form.dni || !form.archivo) {
      setError('Los campos obligatorios son: Nombre, DNI y Archivo PDF')
      return
    }

    const formData = new FormData()
    formData.append('nombre', form.nombre)
    formData.append('dni', form.dni)
    formData.append('tipo', form.tipo || '')
    formData.append('codigo', form.codigo || '')
    formData.append('certificado_nombre', form.certificado_nombre || '')
    formData.append('duracion', form.duracion || '')
    formData.append('fecha_emision', form.fecha_emision || '')
    formData.append('fecha_caducidad', form.fecha_caducidad || '')
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
      setForm({ 
        nombre: '', 
        dni: '', 
        tipo: '',
        codigo: '',
        certificado_nombre: '',
        duracion: '',
        fecha_emision: '',
        fecha_caducidad: '',
        archivo: null 
      })
      // Reset input file manually
      const fileInput = document.getElementById('fileInput')
      if (fileInput) fileInput.value = ''
      
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
                    <th>Tipo</th>
                    <th>Código</th>
                    <th>Fecha Emisión</th>
                    <th>Fecha Caducidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td>
                      <td>{c.dni}</td>
                      <td>{c.tipo || '-'}</td>
                      <td>{c.codigo || '-'}</td>
                      <td>
                        {c.fecha_emision 
                          ? new Date(c.fecha_emision).toLocaleDateString() 
                          : '-'}
                      </td>
                      <td>
                        {c.fecha_caducidad 
                          ? new Date(c.fecha_caducidad).toLocaleDateString() 
                          : '-'}
                      </td>
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
                Nombres y Apellidos *
                <input
                  type="text"
                  value={form.nombre}
                  onChange={manejarCambioCampo('nombre')}
                  placeholder="Ej: Juan Perez"
                  required
                />
              </label>
              
              <label>
                DNI * (solo números)
                <input
                  type="text"
                  value={form.dni}
                  onChange={manejarCambioDNI}
                  placeholder="Ej: 12345678"
                  required
                />
              </label>

              <label>
                Tipo
                <select
                  value={form.tipo}
                  onChange={manejarCambioCampo('tipo')}
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="Curso">Curso</option>
                  <option value="Taller">Taller</option>
                  <option value="Programa">Programa</option>
                  <option value="Diplomado">Diplomado</option>
                  <option value="Inducción">Inducción</option>
                </select>
              </label>

              <label>
                Código
                <input
                  type="text"
                  value={form.codigo}
                  onChange={manejarCambioCampo('codigo')}
                  placeholder="Ej: CERT-2024-001"
                />
              </label>

              <label>
                Certificado (Nombre del certificado)
                <input
                  type="text"
                  value={form.certificado_nombre}
                  onChange={manejarCambioCampo('certificado_nombre')}
                  placeholder="Ej: Certificado de Finalización"
                />
              </label>

              <label>
                Duración
                <input
                  type="text"
                  value={form.duracion}
                  onChange={manejarCambioCampo('duracion')}
                  placeholder="Ej: 40 horas"
                />
              </label>

              <label>
                Fecha de Emisión
                <input
                  type="date"
                  value={form.fecha_emision}
                  onChange={manejarCambioCampo('fecha_emision')}
                />
              </label>

              <label>
                Fecha de Caducidad (opcional)
                <input
                  type="date"
                  value={form.fecha_caducidad}
                  onChange={manejarCambioCampo('fecha_caducidad')}
                  placeholder="Dejar en blanco si no tiene caducidad"
                />
              </label>

              <label>
                Archivo PDF *
                <input 
                  id="fileInput"
                  type="file" 
                  accept="application/pdf" 
                  onChange={manejarCambioArchivo}
                  required
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
