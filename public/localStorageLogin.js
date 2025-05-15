// LocalStorage ile giriş durumunu yönet
window.setUserData = function(userData) {
  localStorage.setItem('user', JSON.stringify(userData));
};

window.getUserData = function() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    return null;
  }
};

window.clearUserData = function() {
  localStorage.removeItem('user');
};