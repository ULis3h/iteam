import { useEffect, useState } from 'react'
import { getAuthHeaders } from '../contexts/AuthContext'

export default function Test() {
  const [devices, setDevices] = useState<any[]>([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    console.log('Fetching devices...')
    fetch('http://localhost:3000/api/devices', {
      headers: getAuthHeaders(),
    })
      .then(res => {
        console.log('Response status:', res.status)
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then(data => {
        console.log('Data received:', data)
        if (Array.isArray(data)) {
          setDevices(data)
        }
      })
      .catch(err => {
        console.error('Error:', err)
        setError(err.message)
      })
  }, [])

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h1>测试页面</h1>
      <p>设备数量: {devices.length}</p>
      {error && <p style={{ color: 'red' }}>错误: {error}</p>}
      <pre>{JSON.stringify(devices, null, 2)}</pre>
    </div>
  )
}
