document.getElementById("registerBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const nativeLang = document.getElementById("nativeLang").value;
  const learningLang = document.getElementById("learningLang").value;

  console.log("REGISTER DATA:", { email, password, nativeLang, learningLang });

  if (!email || !password || !nativeLang || !learningLang) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        nativeLang,
        learningLang
      })
    });

    console.log("RAW RESPONSE:", res);

    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error("JSON parse failed");
      data = {};
    }

    console.log("RESPONSE DATA:", data);

    if (!res.ok) {
      alert(data.error || "Registration failed");
      return;
    }

    window.location.href = "login.html";

  } catch (err) {
    console.error("FETCH ERROR:", err);
    alert("Something went wrong");
  }
};