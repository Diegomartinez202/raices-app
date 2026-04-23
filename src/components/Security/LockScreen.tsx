// Asegúrate de que la ruta sea correcta según tu estructura de carpetas
// src/components/Security/LockScreen.tsx

import { useState } from 'react'
import { verifyPIN, authenticateWithBiometric, isBiometricAvailable, isBiometricEnabled } from '@/core/session/session.service'

interface Props {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handlePINSubmit = async () => {
    const isValid = await verifyPIN(pin)
    if (isValid) {
      onUnlock()
    } else {
      setError('PIN incorrecto')
      setPin('')
      // Aquí podrías disparar una pequeña vibración si usas Capacitor
    }
  }

  const handleBiometric = async () => {
    try {
      const available = await isBiometricAvailable()
      const enabled = await isBiometricEnabled()
      
      if (available && enabled) {
        const ok = await authenticateWithBiometric()
        if (ok) onUnlock()
      } else if (!available) {
        setError('Biometría no disponible en este dispositivo')
      }
    } catch (err) {
      console.error("Error biométrico:", err)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F5F1E8] p-6">
      {/* Icono de Seguridad con el color de RAÍCES */}
      <div className="bg-[#C65D3B] w-20 h-20 rounded-full mb-6 flex items-center justify-center shadow-lg">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-[#2D2A26] mb-2 tracking-tight">RAÍCES</h2>
      <p className="text-sm text-[#6B5E4F] mb-8 font-medium">Soberanía de Datos Local</p>

      <div className="w-full max-w-xs space-y-4 text-center">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code" // Mejora la seguridad en teclados inteligentes
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setError('') // Limpia el error al empezar a escribir
            setPin(e.target.value.replace(/\D/g, ''))
          }}
          onKeyDown={(e) => e.key === 'Enter' && pin.length >= 4 && handlePINSubmit()}
          className="w-full text-center text-4xl tracking-[0.4em] bg-white border-2 border-[#D4A373]/30 focus:border-[#C65D3B] outline-none rounded-2xl p-5 transition-all shadow-inner font-mono"
          placeholder="••••"
          autoFocus
        />

        {error && <p className="text-[#C65D3B] text-[12px] font-bold animate-pulse">{error}</p>}

        <button
          onClick={handlePINSubmit}
          disabled={pin.length < 4}
          className="w-full bg-[#588157] text-white py-4 rounded-2xl font-bold shadow-md active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
        >
          Acceder al Baúl
        </button>

        <button
          onClick={handleBiometric}
          className="flex items-center justify-center gap-2 w-full text-[13px] text-[#6B5E4F] font-semibold py-2"
        >
          <span className="opacity-70">O usa tu huella digital</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12C2 12 5 7 12 7C19 7 22 12 22 12C22 12 19 17 12 17C5 17 2 12 2 12Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
      
      <footer className="absolute bottom-8 text-[10px] text-[#6B5E4F]/40 uppercase tracking-widest">
        Protección Macrocaso 10 - JEP
      </footer>
    </div>
  )
}