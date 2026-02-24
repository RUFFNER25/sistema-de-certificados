import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

export default function AdminPage() {
  const [resultados, setResultados] = useState([])
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [form, setForm] = useState({ 
    nombre: '', 
    dni: '', 
    tipo: '',
    tipo_otro: '',
    codigo: '',
    certificado_nombre: '',
    duracion: '',
    fecha_emision: '',
    fecha_caducidad: '',
    archivo: null 
  })
  const [subiendo, setSubiendo] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const { token, logout } = useAuth()

  const formatearFecha = (valor) => {
    if (!valor) return '-'
    const str = String(valor).slice(0, 10)
    const [yyyy, mm, dd] = str.split('-')
    if (!yyyy || !mm || !dd) return str
    return `${dd}/${mm}/${yyyy}`
  }

  const cargarCertificados = async (opts = {}) => {
    try {
      const q = opts.q !== undefined ? opts.q : filtro
      const fd = opts.fechaDesde !== undefined ? opts.fechaDesde : fechaDesde
      const fh = opts.fechaHasta !== undefined ? opts.fechaHasta : fechaHasta
      const ft = opts.filtroTipo !== undefined ? opts.filtroTipo : filtroTipo
      
      const searchParams = new URLSearchParams()
      if (q && q.trim()) searchParams.set('q', q.trim())
      if (fd) searchParams.set('fecha_desde', fd)
      if (fh) searchParams.set('fecha_hasta', fh)
      if (ft) searchParams.set('tipo', ft)

      const query = searchParams.toString()
      const url = query ? `${API_BASE}/api/certificados?${query}` : `${API_BASE}/api/certificados`
      const resp = await fetch(url)
      if (resp.ok) {
        const data = await resp.json()
        setResultados(data || [])
        // Calculamos total de páginas basado en el total recibido
        setTotalPaginas(Math.ceil((data.length || 0) / 10) || 1)
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
    setPagina(1)
    cargarCertificados({ q: val })
  }

  const handleFechaDesdeChange = (e) => {
    const val = e.target.value
    setFechaDesde(val)
    setPagina(1)
    cargarCertificados({ fechaDesde: val })
  }

  const handleFechaHastaChange = (e) => {
    const val = e.target.value
    setFechaHasta(val)
    setPagina(1)
    cargarCertificados({ fechaHasta: val })
  }

  const handleFiltroTipoChange = (e) => {
    const val = e.target.value
    setFiltroTipo(val)
    setPagina(1)
    cargarCertificados({ filtroTipo: val })
  }

  const aplicarFiltros = () => {
    setPagina(1)
    cargarCertificados()
  }

  const limpiarFiltros = () => {
    setFiltro('')
    setFechaDesde('')
    setFechaHasta('')
    setFiltroTipo('')
    setPagina(1)
    cargarCertificados({ q: '', fechaDesde: '', fechaHasta: '', filtroTipo: '' })
  }

  const handleCambiarPagina = (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPagina(nuevaPagina)
    }
  }

  // Obtener solo los 10 resultados de la página actual
  const resultadosPaginados = resultados.slice((pagina - 1) * 10, pagina * 10)

  const manejarCambioArchivo = (e) => {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, archivo: file }))
  }

  const manejarCambioDNI = (e) => {
    const valor = e.target.value
    // Permitir DNI o pasaporte (letras y números), máx. 20 caracteres
    if (valor.length <= 20) {
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

    if (!form.nombre || !form.dni) {
      setError('Los campos obligatorios son: Nombre y DNI son obligatorios')
      return
    }

    if (!editandoId && !form.archivo) {
      setError('Para crear un certificado nuevo debes adjuntar el archivo PDF')
      return
    }

    if (form.dni.trim().length > 20) {
      setError('El documento de identidad no puede superar 20 caracteres')
      return
    }

    if (form.nombre.trim().length > 200) {
      setError('El nombre no puede superar 200 caracteres')
      return
    }

    if (form.fecha_emision && form.fecha_caducidad && form.fecha_caducidad < form.fecha_emision) {
      setError('La fecha de caducidad no puede ser anterior a la fecha de emisión')
      return
    }

    const hoy = new Date().toISOString().slice(0, 10)
    if (form.fecha_emision && form.fecha_emision > hoy) {
      setError('La fecha de emisión no puede ser futura')
      return
    }

    const tipoEnviar = form.tipo === 'Otro' ? (form.tipo_otro || '').trim() : (form.tipo || '')
    setSubiendo(true)
    try {
      if (editandoId) {
        // Actualizar certificado (sin cambiar PDF)
        const payload = {
          nombre: form.nombre,
          dni: form.dni,
          tipo: tipoEnviar,
          codigo: form.codigo || '',
          certificado_nombre: form.certificado_nombre || '',
          duracion: form.duracion || '',
          fecha_emision: form.fecha_emision || '',
          fecha_caducidad: form.fecha_caducidad || '',
        }

        const resp = await fetch(`${API_BASE}/api/certificados/${editandoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        })

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}))
          throw new Error(data.error || 'Error al actualizar certificado')
        }

        setMensaje('Certificado actualizado exitosamente.')
      } else {
        // Crear nuevo certificado
        const formData = new FormData()
        formData.append('nombre', form.nombre)
        formData.append('dni', form.dni)
        formData.append('tipo', tipoEnviar)
        formData.append('codigo', form.codigo || '')
        formData.append('certificado_nombre', form.certificado_nombre || '')
        formData.append('duracion', form.duracion || '')
        formData.append('fecha_emision', form.fecha_emision || '')
        formData.append('fecha_caducidad', form.fecha_caducidad || '')
        formData.append('archivo', form.archivo)

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
      }

      // Reset común tras crear/editar
      setForm({ 
        nombre: '', 
        dni: '', 
        tipo: '',
        tipo_otro: '',
        codigo: '',
        certificado_nombre: '',
        duracion: '',
        fecha_emision: '',
        fecha_caducidad: '',
        archivo: null 
      })
      setEditandoId(null)

      // Reset input file manualmente
      const fileInput = document.getElementById('fileInput')
      if (fileInput) fileInput.value = ''
      
      cargarCertificados()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  const handleEditarCertificado = (cert) => {
    setMensaje('')
    setError('')
    setEditandoId(cert.id)

    // Resolver tipo / tipo_otro
    const tiposFijos = ['Curso', 'Taller', 'Programa', 'Diplomado', 'Inducción']
    let tipo = ''
    let tipo_otro = ''
    if (cert.tipo && tiposFijos.includes(cert.tipo)) {
      tipo = cert.tipo
      tipo_otro = ''
    } else if (cert.tipo) {
      tipo = 'Otro'
      tipo_otro = cert.tipo
    }

    const toDateInput = (value) => {
      if (!value) return ''
      // Asegurar formato YYYY-MM-DD
      const str = String(value)
      return str.length >= 10 ? str.slice(0, 10) : str
    }

    setForm(prev => ({
      ...prev,
      nombre: cert.nombre || '',
      dni: cert.dni || '',
      tipo,
      tipo_otro,
      codigo: cert.codigo || '',
      certificado_nombre: cert.certificado_nombre || '',
      duracion: cert.duracion || '',
      fecha_emision: toDateInput(cert.fecha_emision),
      fecha_caducidad: toDateInput(cert.fecha_caducidad),
      archivo: null,
    }))
  }

  const handleEliminarCertificado = async (cert) => {
    const confirmar = window.confirm(`¿Seguro que deseas eliminar el certificado de "${cert.nombre}"? Esta acción no se puede deshacer.`)
    if (!confirmar) return

    setMensaje('')
    setError('')

    try {
      const resp = await fetch(`${API_BASE}/api/certificados/${cert.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error || 'Error al eliminar certificado')
      }

      setResultados(prev => prev.filter(c => c.id !== cert.id))
      setMensaje('Certificado eliminado correctamente.')

      // Si estábamos editando este mismo, resetear el formulario
      if (editandoId === cert.id) {
        setEditandoId(null)
        setForm({ 
          nombre: '', 
          dni: '', 
          tipo: '',
          tipo_otro: '',
          codigo: '',
          certificado_nombre: '',
          duracion: '',
          fecha_emision: '',
          fecha_caducidad: '',
          archivo: null 
        })
        const fileInput = document.getElementById('fileInput')
        if (fileInput) fileInput.value = ''
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  return (
    <div className={`app app-admin ${menuAbierto ? 'mobile-menu-open' : ''}`}>
      <button 
        className="admin-mobile-toggle" 
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label="Menu"
      >
        {menuAbierto ? '✕' : '☰'}
      </button>

      <aside className={`admin-sidebar ${menuAbierto ? 'active' : ''}`}>
        <div>
          <div className="admin-brand">
            <img src="/logo.png" alt="Logo" className="admin-brand-logo" />
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

      {menuAbierto && <div className="admin-sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>}

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
                <label className="admin-filter-label">
                  DNI o Nombres
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={filtro}
                    onChange={handleFiltroChange}
                  />
                </label>
                <label className="admin-filter-label">
                  Fecha desde
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={handleFechaDesdeChange}
                  />
                </label>
                <label className="admin-filter-label">
                  Fecha hasta
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={handleFechaHastaChange}
                  />
                </label>
                <label className="admin-filter-label">
                  Tipo
                  <select value={filtroTipo} onChange={handleFiltroTipoChange}>
                    <option value="">Todos</option>
                    <option value="Curso">Curso</option>
                    <option value="Taller">Taller</option>
                    <option value="Programa">Programa</option>
                    <option value="Diplomado">Diplomado</option>
                    <option value="Inducción">Inducción</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>
                <button type="button" className="admin-btn admin-btn-primary" onClick={aplicarFiltros}>
                  Aplicar filtros
                </button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={limpiarFiltros}>
                  Eliminar filtros
                </button>
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
                  {resultadosPaginados.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td>
                      <td>{c.dni}</td>
                      <td>{c.tipo || '-'}</td>
                      <td>{c.codigo || '-'}</td>
                      <td>{formatearFecha(c.fecha_emision)}</td>
                      <td>{formatearFecha(c.fecha_caducidad)}</td>
                      <td>
                        <div className="admin-actions">
                          <a href={`${API_BASE}${c.url}`} target="_blank" rel="noreferrer">
                            Ver PDF
                          </a>
                          <button
                            type="button"
                            className="admin-action-button"
                            onClick={() => handleEditarCertificado(c)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="admin-action-button admin-action-danger"
                            onClick={() => handleEliminarCertificado(c)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {totalPaginas > 1 && (
              <div className="admin-pagination">
                <button 
                  className="admin-btn admin-btn-secondary"
                  disabled={pagina <= 1}
                  onClick={() => handleCambiarPagina(pagina - 1)}
                >
                  Anterior
                </button>
                <span className="pagination-info">
                  Página {pagina} de {totalPaginas}
                </span>
                <button 
                  className="admin-btn admin-btn-secondary"
                  disabled={pagina >= totalPaginas}
                  onClick={() => handleCambiarPagina(pagina + 1)}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          <div className="admin-form">
            <h2>Nuevo Certificado</h2>
            <form className="form" onSubmit={manejarSubmit}>
              <label>
                Apellidos y Nombres *
                <input
                  type="text"
                  value={form.nombre}
                  onChange={manejarCambioCampo('nombre')}
                  placeholder="Ej: Pérez García, Juan"
                  required
                />
              </label>
              
              <label>
                DNI/CE/PAS *
                <input
                  type="text"
                  value={form.dni}
                  onChange={manejarCambioDNI}
                  placeholder="Ej: 70552292 o AA123456"
                  maxLength={20}
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
                  <option value="Otro">Otro</option>
                </select>
              </label>
              {form.tipo === 'Otro' && (
                <label>
                  Especifique el tipo
                  <input
                    type="text"
                    value={form.tipo_otro}
                    onChange={manejarCambioCampo('tipo_otro')}
                    placeholder="Ej: Capacitación, Seminario..."
                  />
                </label>
              )}

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
