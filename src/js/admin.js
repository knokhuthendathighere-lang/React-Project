import { supabase } from "../supabase/supabase.js";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  loginButton.disabled = true;
  loginButton.textContent = "Signing In...";
  loginMessage.textContent = "";

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    loginMessage.textContent = error.message;
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";

    return;
  }

  loginMessage.textContent = "Login successful!";

  console.log("Authenticated user:", data.user.email);

  loginButton.textContent = "Redirecting...";

  window.location.href = "/dashboard.html";

  console.log("Authenticated user:", data.user.email);

  loginButton.textContent = "Signed In";
});
