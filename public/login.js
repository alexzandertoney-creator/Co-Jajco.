// Already logged in? Skip the form.
if (localStorage.getItem("token")) window.location.replace("index.html");

const form = document.getElementById("loginForm");
const btn = document.getElementById("loginBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return toast("Enter your email and password.", "error");

  btn.disabled = true;
  btn.textContent = "Logging in…";
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      // Same message for unknown email and wrong password: don't reveal which accounts exist.
      toast(res.status >= 500 ? "The server had a problem. Try again in a moment." : "Email or password is incorrect.", "error");
      return;
    }
    localStorage.setItem("token", data.token);
    window.location.replace("index.html");
  } catch {
    toast("Can't reach the server. Check your connection and try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Log in";
  }
});
