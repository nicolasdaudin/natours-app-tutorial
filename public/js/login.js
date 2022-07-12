import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in succesfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (error) {
    if (error.response) {
      console.log('error response');
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      showAlert('error', error.response.status);
    } else if (error.request) {
      console.log('Error request', error.request);
    } else {
      console.log('Error', error.message);
    }
    console.log('Error config', error.config);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });

    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert('error', 'Error logging out! Sorry! Try again!');
  }
};
