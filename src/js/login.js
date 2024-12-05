const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const voter_id = document.getElementById('voter-id').value;
  const password = document.getElementById('password').value;
  const token = voter_id;

  const headers = {
    'method': "GET",
    'Authorization': `Bearer ${token}`,
  };

  fetch(`http://127.0.0.1:8000/login?voter_id=${voter_id}&password=${password}`, { headers })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        alert("Login Failed! Please Check Password and Username.")
      }
    })
    .then(data => {
      if (data.role === 'admin') {
        alert("Admin Detected! Routing to Admin Panel.")
        localStorage.setItem('jwtTokenAdmin', data.token);
        window.location.replace(`http://127.0.0.1:8080/admin?Authorization=Bearer ${localStorage.getItem('jwtTokenAdmin')}`);
      } else if (data.role === 'user') {
        localStorage.setItem('jwtTokenVoter', data.token);
        window.location.replace(`http://127.0.0.1:8080/main?Authorization=Bearer ${localStorage.getItem('jwtTokenVoter')}`);
      }
    })
    .catch(error => {
      alert("Login Failed! Something went wrong")
    });
});
