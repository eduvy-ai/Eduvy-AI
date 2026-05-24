// ─── Axios Instance Configuration ─────────────────────────────
// Central axios instance with base configuration
// All API calls should use this instance

import axios from 'axios'
import { API_BASE_URL, APP_CONFIG } from '../config'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: APP_CONFIG.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default axiosInstance
