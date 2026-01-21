import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'

const API_BASE = 'http://localhost:4000'

function useCertificados() {
  const [vista, setVista] = React.useState('publico')
  const [busqueda, setBusqueda] = React.useState('')
  const [resultados, setResultados] = React.useState([])
  const [cargandoBusqueda, setCargandoBusqueda] = React.useState(false)
  const [errorBusqueda, setErrorBusqueda] = React.useState('')

  const [formAdmin, setFormAdmin] = React.useState({
    nombre: '',
    dni: '',
    archivo: null,
  })
  const [subiendo, setSubiendo] = React.useState(false)
  const [mensajeAdmin, setMensajeAdmin] = React.useState('')
  const [errorAdmin, setErrorAdmin] = React.useState('')

  const manejarBuscar = async (e) => {
    e.preventDefault()
    setCargandoBusqueda(true)
    setErrorBusqueda('')
    try {
      const url =
        busqueda.trim().length > 0
          ? `${API_BASE}/api/certificados?q=${encodeURIComponent(busqueda.trim())}`
          : `${API_BASE}/api/certificados`
      const resp = await fetch(url)
      if (!resp.ok) {
        throw new Error('No se pudo obtener la lista de certificados')
      }
      const data = await resp.json()
      setResultados(data)
    } catch (err) {
      console.error(err)
      setErrorBusqueda('Error al buscar certificados')
    } finally {
      setCargandoBusqueda(false)
    }
  }

  const manejarCambioArchivo = (e) => {
    const file = e.target.files?.[0] ?? null
    setFormAdmin((prev) => ({ ...prev, archivo: file }))
  }

  const manejarSubmitAdmin = async (e) => {
    e.preventDefault()
    setMensajeAdmin('')
    setErrorAdmin('')

    if (!formAdmin.nombre || !formAdmin.dni || !formAdmin.archivo) {
      setErrorAdmin('Completa nombre, DNI y selecciona un PDF')
      return
    }

    const formData = new FormData()
    formData.append('nombre', formAdmin.nombre)
    formData.append('dni', formAdmin.dni)
    formData.append('archivo', formAdmin.archivo)

    setSubiendo(true)
    try {
      const resp = await fetch(`${API_BASE}/api/certificados`, {
        method: 'POST',
        body: formData,
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error || 'Error al subir certificado')
      }
      setMensajeAdmin('Certificado cargado correctamente')
      setFormAdmin({ nombre: '', dni: '', archivo: null })
      // refrescar listado en modo admin
      if (vista === 'admin') {
        const listaResp = await fetch(`${API_BASE}/api/certificados`)
        if (listaResp.ok) {
          const listaData = await listaResp.json()
          setResultados(listaData)
        }
      }
    } catch (err) {
      console.error(err)
      setErrorAdmin(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return {
    vista,
    setVista,
    busqueda,
    setBusqueda,
    resultados,
    setResultados,
    cargandoBusqueda,
    setCargandoBusqueda,
    errorBusqueda,
    setErrorBusqueda,
    formAdmin,
    setFormAdmin,
    subiendo,
    setSubiendo,
    mensajeAdmin,
    setMensajeAdmin,
    errorAdmin,
    setErrorAdmin,
    manejarBuscar,
    manejarCambioArchivo,
    manejarSubmitAdmin,
  }
}

function PublicPage({ state }) {
  const {
    busqueda,
    setBusqueda,
    resultados,
    cargandoBusqueda,
    errorBusqueda,
    manejarBuscar,
  } = state

  React.useEffect(() => {
    ;(async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/certificados`)
        if (resp.ok) {
          const data = await resp.json()
          state.setResultados(data)
        }
      } catch {
        // silencioso
      }
    })()
  }, [])

  return (
    <div className="app app-public">
      <header className="public-header">
        <div className="public-header-left">
          <div className="public-logo">📄</div>
          <div>
            <div className="public-header-title">Buscador de Certificados</div>
            <div className="public-header-subtitle">Sitio público de verificación de Empresa SITech</div>
          </div>
        </div>
        <nav className="top-links">
          <Link to="/admin">Ir al panel administrador</Link>
        </nav>
      </header>

      <section className="public-hero">
        <h1 className="public-hero-title">Buscador de Certificados por DNI</h1>
        <p className="public-hero-text">
          Ingresa el DNI para buscar y validar certificados emitidos por nuestra institución.
        </p>

        <form className="public-search" onSubmit={manejarBuscar}>
          <label className="public-search-label">
            Número de DNI
            <div className="public-search-row">
              <input
                type="text"
                placeholder="12.345.678"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button type="submit" disabled={cargandoBusqueda}>
                {cargandoBusqueda ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </label>
        </form>
        {errorBusqueda && <p className="error hero-error">{errorBusqueda}</p>}
      </section>

      <main className="public-main">
        <h2 className="public-results-title">Resultados de la búsqueda</h2>
        {resultados.length === 0 ? (
          <p className="public-no-results">
            No hay certificados para mostrar. Ingresa un DNI y presiona Buscar.
          </p>
        ) : (
          <div className="public-results-list">
            {resultados.map((c) => (
              <article className="result-card" key={c.id}>
                <div className="result-card-main">
                  <h3 className="result-title">Certificado a nombre de {c.nombre}</h3>
                  <p className="result-meta">
                    <span className="result-label">Titular:</span> {c.nombre}
                  </p>
                  <p className="result-meta">
                    <span className="result-label">DNI:</span> {c.dni}
                  </p>
                  <p className="result-meta">
                    <span className="result-label">Fecha de emisión:</span>{' '}
                    {new Date(c.creado_en).toLocaleString()}
                  </p>
                </div>
                <div className="result-card-actions">
                  <a
                    href={`${API_BASE}${c.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                  >
                    Ver / Descargar PDF
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function AdminPage({ state }) {
  const {
    resultados,
    formAdmin,
    setFormAdmin,
    subiendo,
    mensajeAdmin,
    errorAdmin,
    manejarSubmitAdmin,
    manejarCambioArchivo,
    setResultados,
  } = state

  React.useEffect(() => {
    ;(async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/certificados`)
        if (resp.ok) {
          const data = await resp.json()
          setResultados(data)
        }
      } catch {
        // silencioso
      }
    })()
  }, [])

  return (
    <div className="app app-admin">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">SI</div>
          <div>
            <div className="admin-brand-name">Empresa SITech</div>
            <div className="admin-brand-role">Panel de Admin</div>
          </div>
        </div>
        <nav className="admin-menu">
          <button className="admin-menu-item active">Certificados</button>
        </nav>
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-link"
            onClick={() => (window.location.href = '/')}
          >
            ← Ver buscador público
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Gestión de Certificados</h1>
          <p>
            Crea y gestiona todos los certificados emitidos por la institución. Puedes buscar por
            nombre o DNI.
          </p>
        </header>

        <section className="admin-content">
          <div className="admin-list">
            <div className="admin-list-header">
              <h2>Certificados existentes</h2>
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="Buscar certificados por nombre o DNI"
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) {
                      // recargar todos
                      fetch(`${API_BASE}/api/certificados`)
                        .then((r) => r.json())
                        .then(setResultados)
                        .catch(() => {})
                    } else {
                      fetch(`${API_BASE}/api/certificados?q=${encodeURIComponent(value)}`)
                        .then((r) => r.json())
                        .then(setResultados)
                        .catch(() => {})
                    }
                  }}
                />
              </div>
            </div>

            {resultados.length === 0 ? (
              <p className="public-no-results">No hay certificados cargados aún.</p>
            ) : (
              <table className="tabla admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>DNI</th>
                    <th>Fecha</th>
                    <th>Certificado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td>
                      <td>{c.dni}</td>
                      <td>{new Date(c.creado_en).toLocaleString()}</td>
                      <td>
                        <a
                          href={`${API_BASE}${c.url}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className="admin-form">
            <h2>Crear nuevo certificado</h2>
            <form className="form" onSubmit={manejarSubmitAdmin}>
              <label>
                Nombre del titular
                <input
                  type="text"
                  value={formAdmin.nombre}
                  onChange={(e) =>
                    setFormAdmin((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  placeholder="Nombre completo"
                />
              </label>
              <label>
                DNI
                <input
                  type="text"
                  value={formAdmin.dni}
                  onChange={(e) =>
                    setFormAdmin((prev) => ({ ...prev, dni: e.target.value }))
                  }
                  placeholder="Documento"
                />
              </label>
              <label>
                Archivo PDF
                <input type="file" accept="application/pdf" onChange={manejarCambioArchivo} />
              </label>
              <button type="submit" disabled={subiendo}>
                {subiendo ? 'Guardando...' : 'Crear certificado'}
              </button>
            </form>
            {mensajeAdmin && <p className="ok">{mensajeAdmin}</p>}
            {errorAdmin && <p className="error">{errorAdmin}</p>}
          </aside>
        </section>
      </main>
    </div>
  )
}

function App() {
  const state = useCertificados()

  return (
    <Routes>
      <Route path="/" element={<PublicPage state={state} />} />
      <Route path="/admin" element={<AdminPage state={state} />} />
    </Routes>
  )
}

export default App
