
import { createUserService } from './operations/createUserService';
import { deleteUserService } from './operations/deleteUserService';
import { updateUserService } from './operations/updateUserService';
import { queryUserService } from './operations/queryUserService';

/**
 * Service responsible for CRUD operations on users
 */
export const userCrudService = {
  // Re-export specific operations from specialized services
  createUser: createUserService.createUser,
  deleteUser: deleteUserService.deleteUser,
  updateUser: updateUserService.updateUser,
  findUserByEmail: queryUserService.findUserByEmail
};
