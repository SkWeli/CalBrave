import api from './api.js'

const weightService = {

  // POST /api/weight/log
  logWeight: (weight, date) => {
    return api.post('/weight/log', { weight, date })
  },

  // GET /api/weight/history
  getHistory: () => {
    return api.get('/weight/history')
  },

  // GET /api/weight/latest
  getLatest: () => {
    return api.get('/weight/latest')
  }

}

export default weightService
