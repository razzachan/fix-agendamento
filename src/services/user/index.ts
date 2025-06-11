
import { authService } from './authService';
import { userCrudService } from './userCrudService';
import { workshopService } from './workshopService';
import { supabaseAuthService } from './auth';

// Create an aggregate service that combines all the user services
export const userService = {
  // Auth service methods
  login: authService.login,
  register: authService.register,
  logout: authService.logout,
  getCurrentUser: authService.getCurrentUser,
  
  // User CRUD service methods
  createUser: userCrudService.createUser,
  deleteUser: userCrudService.deleteUser,
  updateUser: supabaseAuthService.updateProfile, // Usar a implementação do Supabase
  findUserByEmail: userCrudService.findUserByEmail,
  
  // Workshop service methods
  findAllWorkshops: workshopService.findAllWorkshops
};
