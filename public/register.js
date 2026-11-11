const form = document.getElementById("registerForm");
const btn = document.getElementById("registerBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const nativeLang = document.getElementById("nativeLang").value;
  const learningLang = document.getElementById("learningLang").value;

  if (!email || !password) return toast("Enter an email and a password.", "error");
  if (password.length < 8) return toast("Use a password with at least 8 characters.", "error");
  if (nativeLang === learningLang) return toast("Pick a language you're learning that's different from the one you speak.", "error");

  btn.disabled = true;
  btn.textContent = "Creating account…";
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nativeLang, learningLang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || "Couldn't create the account. Try again.", "error");
      return;
    }
    // The API returns a token on sign-up, so go straight in.
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("learningLang", learningLang);
      window.location.replace("index.html");
    } else {
      window.location.replace("login.html");
    }
  } catch {
    toast("Can't reach the server. Check your connection and try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create account";
  }
});
