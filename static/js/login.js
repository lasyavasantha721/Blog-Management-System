
document.getElementById("loginForm").addEventListener("submit", async function (e) {
e.preventDefault(); // Prevent default form submission

const form = e.target;
const formData = new FormData(form);

try {
    const response = await fetch("/login", {
    method: "POST",
    body: formData,
    credentials: "include" // Important: sends cookies
    });

    if (response.ok) {
    // Redirect to /me or /dashboard if login is successful
    window.location.href = "/me";
    } else {
    const data = await response.json();
    alert(data.detail || "Login failed.");
    }
} catch (err) {
    console.error("Login error:", err);
    alert("An error occurred. Please try again.");
}
});
