import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <!-- PANEL IZQUIERDO PREMIUM -->
      <div class="auth-brand">
        <!-- Esferas de luz decorativas de fondo -->
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>

        <div class="brand-container">
          <div class="brand-logo">
            <div class="logo-box">
              <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="10" fill="white"/>
                <path d="M10 18L16 24L26 12" stroke="var(--brand-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="brand-name">ANY-WORK</span>
          </div>
          <p class="brand-tagline">Gestiona tu negocio con inteligencia y control total</p>

          <!-- LISTA DE CARACTERÍSTICAS CON ENTRADA ESCALONADA -->
          <div class="feature-list">
            <div class="feature-item" style="--delay: 1">
              <div class="icon-wrapper">📦</div>
              <div class="feature-text">
                <strong>Inventario inteligente</strong>
                <span>Control de stock en tiempo real y alertas de mínimos.</span>
              </div>
            </div>
            
            <div class="feature-item" style="--delay: 2">
              <div class="icon-wrapper">💰</div>
              <div class="feature-text">
                <strong>Finanzas bajo control</strong>
                <span>Asienta tus ventas de mostrador y egresos de caja.</span>
              </div>
            </div>
            
            <div class="feature-item" style="--delay: 3">
              <div class="icon-wrapper">📊</div>
              <div class="feature-text">
                <strong>Análisis de métricas</strong>
                <span>Reportes automáticos para tomar decisiones informadas.</span>
              </div>
            </div>
            
            <div class="feature-item" style="--delay: 4">
              <div class="icon-wrapper">🎨</div>
              <div class="feature-text">
                <strong>Identidad a medida</strong>
                <span>Personaliza colores y temas según la marca de tu negocio.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DERECHO DE INTERFAZ -->
      <div class="auth-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    /* ── ESTRUCTURA GENERAL SPLIT SCREEN ── */
    .auth-shell {
      min-height: 100vh;
      width: 100vw;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      background: var(--bg-page, #f8fafc);
      overflow: hidden;
      font-family: 'Inter', sans-serif;
    }

    /* ── PANEL DE MARCA IZQUIERDO ── */
    .auth-brand {
      background: linear-gradient(135deg, var(--brand-primary, #6366f1) 0%, #312e81 100%);
      padding: 4rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      color: white;
      position: relative;
      overflow: hidden;
    }

    .brand-container {
      max-width: 480px;
      margin: 0 auto;
      z-index: 10;
    }

    /* ── ESFERAS DE LUZ ABSTRACTAS DE FONDO ── */
    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.35;
      pointer-events: none;
      z-index: 1;
    }
    .orb-1 {
      width: 350px;
      height: 350px;
      background: #8b5cf6;
      top: -10%;
      left: -10%;
      animation: floatSlow 8s ease-in-out infinite;
    }
    .orb-2 {
      width: 300px;
      height: 300px;
      background: #06b6d4;
      bottom: -10%;
      right: -10%;
      animation: floatSlow 12s ease-in-out infinite alternate;
    }

    /* ── LOGOTIPO ── */
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 1.25rem;
      animation: slideRight 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .logo-box {
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      transition: transform 0.3s ease;
    }

    .logo-box:hover {
      transform: scale(1.08) rotate(-2deg);
    }

    .brand-name {
      font-family: 'Sora', sans-serif;
      font-size: 1.85rem;
      font-weight: 800;
      color: white;
      letter-spacing: -0.03em;
    }

    .brand-tagline {
      font-size: 1.15rem;
      opacity: 0.85;
      margin: 0 0 4rem;
      line-height: 1.6;
      font-weight: 400;
      animation: slideRight 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── LISTA DE CARACTERÍSTICAS (GLASSMORPHISM) ── */
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1.15rem 1.35rem;
      border-radius: 16px;
      backdrop-filter: blur(16px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      
      /* Animación de entrada en cascada */
      opacity: 0;
      transform: translateX(-20px);
      animation: cascadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      animation-delay: calc(var(--delay) * 0.12s);
    }

    .feature-item:hover {
      transform: translateX(6px);
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
    }

    .icon-wrapper {
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      flex-shrink: 0;
    }

    .feature-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .feature-text strong {
      font-size: 0.95rem;
      font-weight: 600;
      color: white;
    }

    .feature-text span {
      font-size: 0.825rem;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.4;
    }

    /* ── CONTENEDOR DERECHO DE RUTAS ── */
    .auth-content {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      background: var(--bg-page, #f8fafc);
      position: relative;
    }

    /* ── ANIMACIONES NATIVAS ── */
    @keyframes floatSlow {
      0% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-15px) rotate(5deg); }
      100% { transform: translateY(0) rotate(0deg); }
    }

    @keyframes slideRight {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes cascadeIn {
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* ── ADAPTABILIDAD MÓVIL ── */
    @media (max-width: 920px) {
      .auth-shell {
        grid-template-columns: 1fr;
      }
      .auth-brand {
        display: none; /* Escondemos el branding en tablets y celulares */
      }
      .auth-content {
        padding: 2rem 1.5rem;
      }
    }
  `]

})
export class AuthLayoutComponent {}
