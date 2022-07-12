// file to get data from the user interface and delegate actions (to logins.js, ...)
import '@babel/polyfill'; // include the polyfill in the final bundle
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './bookings';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.login-form .form');
const logOutBtn = document.querySelector('.nav__el--logout');
const bookTourBtn = document.querySelector('.book-tour');

// const saveUserSettingsBtn = document.querySelector('.form-user-data .btn--api');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const userProfilePicForm = document.querySelector('.form-photo-upload');

// VALUES

// DELEGATION
if (mapBox) {
  // there's a map in this page
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    // console.log(form);

    updateSettings(form, 'data');
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    userPasswordForm.querySelector('.btn--green').innerHTML =
      'Saving password ... ';
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );
    document.getElementById('password-current').value =
      document.getElementById('password').value =
      document.getElementById('password-confirm').value =
        '';
    userPasswordForm.querySelector('.btn--green').innerHTML = 'Save Password';
  });
}

if (userProfilePicForm) {
  userProfilePicForm.addEventListener('submit', (e) => {
    // e.preventDefault();
  });
}

if (bookTourBtn) {
  bookTourBtn.addEventListener('click', async (e) => {
    bookTourBtn.textContent = 'Processing ...';
    const tourId = e.target.dataset.tourId;
    await bookTour(tourId);
  });
}
