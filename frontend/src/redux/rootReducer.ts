import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../modules/auth/slice';
import usersReducer from '../modules/users/slice';
import productsReducer from '../modules/products/slice';
import ordersReducer from '../modules/orders/slice';

export const rootReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,
  products: productsReducer,
  orders: ordersReducer,
});
