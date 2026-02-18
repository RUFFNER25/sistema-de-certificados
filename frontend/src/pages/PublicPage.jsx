import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'

export default function PublicPage() {
  const [busqueda, setBusqueda] = useState('')
  const [tipoBusqueda, setTipoBusqueda] = useState('dni')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const manejarBuscar = async (e) => {
    e.preventDefault()
    
    if (!busqueda.trim()) {
      setError('Por favor ingrese un valor para buscar')
      return
    }
    
    setCargando(true)
    setError('')
    setSearched(true)

    try {
      const queryParam = `?q=${encodeURIComponent(busqueda.trim())}`
      const url = `${API_BASE}/api/certificados${queryParam}`
      
      console.log('Buscando en:', url) // Debug
      
      const resp = await fetch(url)
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${resp.status}: ${resp.statusText}`)
      }
      
      const data = await resp.json()
      console.log('Resultados recibidos:', data) // Debug
      
      setResultados(data || [])
      
      if (data.length === 0) {
        setError('CONSULTA NO ENCONTRADA, INTENTE DE NUEVO')
      }
    } catch (err) {
      console.error('Error en búsqueda:', err)
      setError('CONSULTA NO ENCONTRADA, INTENTE DE NUEVO')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="app app-public-dark">
      <header className="public-header-dark">
        <div className="public-header-left">
          <div className="public-logo-dark">
            <span className="public-logo-s">S</span>
            <span className="public-logo-text">ITech</span>
          </div>
        </div>
        <div className="public-header-right">
          <Link to="/admin" className="admin-link-dark">Admin</Link>
        </div>
      </header>

      <div className="public-hero-dark">
        <div className="public-hero-background">
          <div className="public-hero-text-bg">CERTIFICADO</div>
          <div className="public-hero-text-bg">DE COMPETENCIAS</div>
        </div>
        
        <h1 className="public-hero-title-dark">Validar certificados</h1>

        <div className="public-search-container">
          <form className="public-search-form" onSubmit={manejarBuscar}>
            <select 
              className="public-search-dropdown"
              value={tipoBusqueda}
              onChange={(e) => setTipoBusqueda(e.target.value)}
            >
              <option value="dni">DNI</option>
              <option value="nombre">Nombres y apellidos</option>
              <option value="codigo">Código de certificado</option>
            </select>
            <input
              type="text"
              className="public-search-input"
              placeholder={
                tipoBusqueda === 'dni' 
                  ? 'Ej: 70552292' 
                  : tipoBusqueda === 'nombre'
                  ? 'Ej: Juan Perez'
                  : 'Ej: CERT-2024-001'
              }
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button type="submit" className="public-search-btn" disabled={cargando}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
            <p className="public-search-instruction">
              Ingrese los siguientes datos: DNI o Apellidos y nombres o código de certificado
            </p>
          {error && <p className="error hero-error">{error}</p>}
        </div>
      </div>

      <main className="public-main-dark">
        {!searched ? (
          <div className="public-no-results" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: 0 }}>
              Ingresa un DNI o nombre en el buscador para verificar certificados.
            </p>
          </div>
        ) : (
          <>
        <h2 className="public-results-title">Los resultados para tu búsqueda:</h2>

        {resultados.length === 0 ? (
          <div className="public-no-results">
            CONSULTA NO ENCONTRADA, INTENTE DE NUEVO
          </div>
        ) : (
          <div className="public-results-list">
            {resultados.map((c) => (
              <article className="result-card" key={c.id}>
                <div className="result-card-header">
                  <span className="result-card-avatar" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="result-card-name">{c.nombre}</span>
                </div>
                <hr className="result-card-divider" />
                <div className="result-card-title-block">
                  <h3 className="result-card-cert-title">{c.certificado_nombre || 'Certificado'}</h3>
                  {c.tipo && <span className="result-card-type">{c.tipo}</span>}
                </div>
                <ul className="result-card-meta">
                  <li className="result-card-meta-item">
                    <span className="result-card-meta-icon" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </span>
                    <span>DNI: {c.dni}</span>
                  </li>
                  {c.codigo && (
                    <li className="result-card-meta-item">
                      <span className="result-card-meta-icon" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span>Código: {c.codigo}</span>
                    </li>
                  )}
                  {c.duracion && (
                    <li className="result-card-meta-item">
                      <span className="result-card-meta-icon" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span>Duración: {c.duracion}</span>
                    </li>
                  )}
                  {c.fecha_emision && (
                    <li className="result-card-meta-item">
                      <span className="result-card-meta-icon" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </span>
                      <span>Fecha de emisión: {new Date(c.fecha_emision).toLocaleDateString('es-PE')}</span>
                    </li>
                  )}
                  <li className="result-card-meta-item">
                    <span className="result-card-meta-icon" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </span>
                    <span>Fecha de caducidad: {c.fecha_caducidad ? new Date(c.fecha_caducidad).toLocaleDateString('es-PE') : '-'}</span>
                  </li>
                </ul>
                <a
                  href={`${API_BASE}${c.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="result-card-download"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Descargar
                </a>
              </article>
            ))}
          </div>
        )}
          </>
        )}

        {/* Sección de Consideraciones - Siempre visible */}
        <div className="public-considerations">
          <h3 className="considerations-title">Consideraciones:</h3>
          <ul className="considerations-list">
            <li className="considerations-item">
              Si deseas validar la autenticidad de un certificado también puedes remitir un correo a{' '}
              <a href="mailto:info@jcecoguardians.com" className="considerations-link">info@jcecoguardians.com</a>{' '}
              o escribirnos directamente al Whatsapp.
            </li>
            <li className="considerations-item">
              La organización no emite certificados por medio de capacitadores, personas terceras u otros, todos los certificados son emitidos desde nuestros correos corporativos{' '}
              <span className="considerations-email">@jcecoguardians.com</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-content">
          <div className="footer-column footer-logo">
            <div className="footer-logo-container">
              <img 
                src="/logo.png" 
                alt="JC ECOGUARDIANS S.A.C." 
                className="footer-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="footer-logo-placeholder" style={{display: 'none'}}>
                <div className="footer-logo-text-large">JC</div>
                <div className="footer-logo-text-small">ECOGUARDIANS</div>
                <div className="footer-logo-text-tiny">S.A.C.</div>
              </div>
            </div>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Contacto</h4>
            <ul className="footer-list">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Mz. B, Lt 12, Ventanilla, Callao
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.98 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/>
                </svg>
                +51 936 812 721
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.98 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/>
                </svg>
                +51 966 784 607
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                info@jcecoguardians.com
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                lun a vie 9:00am - 6:00pm
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Legal</h4>
            <ul className="footer-list">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Políticas de SSOMAC
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Políticas de privacidad
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Libro de Reclamaciones
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Links</h4>
            <ul className="footer-list">
              <li><Link to="/">Inicio</Link></li>
              <li><Link to="/">Nosotros</Link></li>
              <li><Link to="/">Servicios</Link></li>
              <li><Link to="/">Contacto</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Síguenos en:</h4>
            <div className="footer-social">
              <a href="#" className="social-icon" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="#" className="social-icon" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="#" className="social-icon" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            </div>
            <a href="#" className="footer-brochure-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar brochure
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>2026 JC ECOGUARDIANS | Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp mejorado */}
      <div className="whatsapp-widget">
        <div className="whatsapp-bubble">
          <p>¿Necesitas ayuda? Chatea con nosotros</p>
        </div>
        <a 
          href="https://wa.me/51936812721" 
          target="_blank" 
          rel="noreferrer"
          className="whatsapp-float"
          aria-label="Contactar por WhatsApp"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.98 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/>
          </svg>
        </a>
      </div>
    </div>
  )
}
