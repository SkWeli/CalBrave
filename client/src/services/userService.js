import api from './api.js'

const userService = {

  // POST /api/users/profile
  saveProfile: (profileData) => {
    return api.post('/users/profile', profileData)
  },

  // GET /api/users/profile
  getProfile: () => {
    return api.get('/users/profile')
  }

}

export default userService
