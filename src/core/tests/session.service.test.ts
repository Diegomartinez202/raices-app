import { describe, it, expect, beforeEach } from 'vitest'
import { setPIN, verifyPIN, hasPIN } from '../session/session.service'

describe('Session Service - PIN', () => {
  beforeEach(() => {
    localStorage.clear() // Limpia entre pruebas
  })

  it('debe crear PIN de 6 dígitos', async () => {
    const result = await setPIN('123456')
    expect(result).toBe(true)
    expect(await hasPIN()).toBe(true)
  })

  it('debe rechazar PIN de menos de 6 dígitos', async () => {
    await expect(setPIN('123')).rejects.toThrow('PIN debe ser 6 dígitos')
  })

  it('debe verificar PIN correcto', async () => {
    await setPIN('654321')
    const valid = await verifyPIN('654321')
    expect(valid).toBe(true)
  })

  it('debe rechazar PIN incorrecto', async () => {
    await setPIN('111111')
    const valid = await verifyPIN('222222')
    expect(valid).toBe(false)
  })
})

it('no debe guardar el PIN en texto plano', async () => {
    const pin = '999999';
    await setPIN(pin);
    const storedData = localStorage.getItem('raices_pin_storage'); 
    expect(storedData).not.toContain(pin); // Verifica que el PIN no es visible
  });
