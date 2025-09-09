import { getCurrentUser } from './auth'

// 인증 토큰을 포함한 API 호출 함수
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const user = getCurrentUser()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // options.headers가 있으면 추가
  if (options.headers) {
    if (options.headers instanceof Headers) {
      // Headers 객체인 경우
      options.headers.forEach((value, key) => {
        headers[key] = value
      })
    } else if (typeof options.headers === 'object') {
      // 일반 객체인 경우
      Object.assign(headers, options.headers)
    }
  }

  // 인증된 사용자가 있으면 토큰 추가
  if (user) {
    headers['Authorization'] = `Bearer ${user.uid}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}

// GET 요청
export const apiGet = (url: string) => apiCall(url, { method: 'GET' })

// POST 요청
export const apiPost = (url: string, data: any) => apiCall(url, {
  method: 'POST',
  body: JSON.stringify(data),
})

// PUT 요청
export const apiPut = (url: string, data: any) => apiCall(url, {
  method: 'PUT',
  body: JSON.stringify(data),
})

// DELETE 요청
export const apiDelete = (url: string) => apiCall(url, { method: 'DELETE' })
