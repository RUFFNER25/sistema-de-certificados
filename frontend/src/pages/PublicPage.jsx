import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'

export default function PublicPage() {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  // Opcional: Cargar certificados iniciales o dejar vacio hasta que busque
  // El usuario dijo "No puedo hacer ninguna busqueda", tal vez espera que funcione el botón.
  // Voy a dejar que cargue los iniciales pero si hay error no bloquee.

  useEffect(() => {
    fetch(`${API_BASE}/api/certificados`)
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Error al cargar inicial')
      })
      .then((data) => setResultados(data))
      .catch((err) => console.error(err))
  }, [])

  const manejarBuscar = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    setSearched(true)

    try {
      // Si la búsqueda está vacía, traer todos (o los default)
      const queryParam = busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : ''
      const url = `${API_BASE}/api/certificados${queryParam}`
      
      const resp = await fetch(url)
      if (!resp.ok) {
        throw new Error('Error en la petición al servidor')
      }
      const data = await resp.json()
      setResultados(data)
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al buscar. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

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
        <h1 className="public-hero-title">Verificación de Certificados</h1>
        <p className="public-hero-text">
          Ingresa el DNI o nombre para validar la autenticidad de los certificados emitidos.
        </p>

        <form className="public-search" onSubmit={manejarBuscar}>
          <div className="public-search-row">
            <input
              type="text"
              placeholder="Ej: 12.345.678 o Juan Perez"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button type="submit" disabled={cargando}>
              {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>
        {error && <p className="error hero-error">{error}</p>}
      </section>

      <main className="public-main">
        <h2 className="public-results-title">
          {searched && busqueda 
            ? `Resultados para "${busqueda}"` 
            : 'Certificados Recientes'}
        </h2>

        {resultados.length === 0 ? (
          <div className="public-no-results">
            {searched ? 'No se encontraron certificados con esos datos.' : 'No hay certificados disponibles.'}
          </div>
        ) : (
          <div className="public-results-list">
            {resultados.map((c) => (
              <article className="result-card" key={c.id}>
                <div className="result-card-main">
                  <h3 className="result-title">{c.nombre}</h3>
                  <div className="result-meta">
                    <span className="result-label">DNI:</span> {c.dni}
                  </div>
                  <div className="result-meta">
                    <span className="result-label">Emitido:</span>{' '}
                    {new Date(c.creado_en).toLocaleDateString()}
                  </div>
                </div>
                <div className="result-card-actions">
                  <a
                    href={`${API_BASE}${c.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                  >
                    Descargar PDF
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
