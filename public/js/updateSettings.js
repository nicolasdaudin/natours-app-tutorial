import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  // console.log('user.js - updateSettings - ', data);

  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });
    if (res.data.status === 'success') {
      showAlert('success', `Your ${type} have been successfully updated`);
      // window.setTimeout(() => {
      //   location.reload(true);
      // }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
