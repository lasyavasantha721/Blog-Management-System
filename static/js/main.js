console.log("✅ main.js is successfully loaded!");
// Organizes admin functions in a scoped object
const App = {
  admin: {},
  common: {}
};

/************************************************
  DOM References
************************************************/
// Global variable to store the logged-in user's ID
let currentUserId = null;
let currentUserRole = null;
let blogPosts = [];

// Nav items
const navHome = document.getElementById("navHome");
const navRegister = document.getElementById("navRegister");
const navLogin = document.getElementById("navLogin");
const navLogout = document.getElementById("navLogout");
const navPosts = document.getElementById("navPosts");
const navProfile = document.getElementById("navProfile");
const navCreatePost = document.getElementById("navCreatePost");
const navManageUsers = document.getElementById("navManageUsers");
const signUpLink = document.getElementById("signUpLink");
const signInLink = document.getElementById("signInLink");

// Grab the "Change Password" menu item
const changePasswordSection = document.getElementById("changePasswordSection");

const yourPostsSection = document.getElementById("yourPostsSection");
const closeEditProfile = document.getElementById("closeEditProfile");
const savedPostsSection = document.getElementById("savedPostsSection");
// Sections
const registerSection = document.getElementById("registerSection");
const loginSection = document.getElementById("loginSection");
const postsSection = document.getElementById("postsSection");
const createPostSection = document.getElementById("createPostSection");

// Forms
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const createPostForm = document.getElementById("createPostForm");
const showUpdateUsernameBtn = document.getElementById("showUpdateUsernameBtn");
const updateUsernameForm = document.getElementById("updateUsernameForm");
const cancelUpdateBtn = document.getElementById("cancelUpdateBtn");

// Output
const postsList = document.getElementById("postsGrid");

/**
 * Display messages with professional styling
 * @param {string} containerId  – the ID of the <div> you just added
 * @param {"success"|"error"}  – which CSS class to use
 * @param {string} text         – the message body
 */
function showMessage(containerId, type, text) {
  const container = document.getElementById(containerId);
  if (!container) return console.warn("No container for", containerId);
  
  // Create message element with icon
  const icon = type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-triangle";
  container.innerHTML = `
    <div class="${type}-message">
      <i class="${icon} me-2"></i>${text}
    </div>
  `;
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

// Activate clicked nav item
document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.navbar-nav .nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});


/************************************************
  Hide/Show Sections with Loading States
************************************************/
// This clears the screen before showing the next section.
function hideAllSections() {
  console.log("hideAllSections() called");
  // Loops through each of these sections and adds a hidden class to hide it via CSS.
  document.querySelectorAll(".section-container, .auth-section").forEach((el) => { 
    console.log("Hiding section:", el.id);
    el.classList.add("hidden"); 
    el.style.display = "none";
  });
}

// Shows a specific section by its id after hiding all others
function showSection(sectionId) {
  console.log(`showSection(${sectionId}) called`);
  hideAllSections();

  const target = document.getElementById(sectionId);
  if (target) {
    console.log(`Showing section: ${sectionId}`);
    target.classList.remove("hidden");

    // Uses "block" for admin sections, "flex" otherwise
    if (["adminUsersSection"].includes(sectionId)) {
      target.style.display = "block";
    } else {
      target.style.display = "flex";
    }
    
    // Add fade-in animation
    target.style.opacity = "0";
    target.style.transform = "translateY(20px)";
    
    setTimeout(() => {
      target.style.transition = "all 0.5s ease-out";
      target.style.opacity = "1";
      target.style.transform = "translateY(0)";
    }, 10);
  } else {
    console.warn(`No section found with id=${sectionId}`);
  }
}

// On page load (display sections)
document.addEventListener("DOMContentLoaded", async () => {
  hideAllSections();  

  // Check if user is logged in
  const isLoggedIn = await checkUserStatus(); 

  if (isLoggedIn) {
    // If logged in, show blog posts by default
    applyRoleBasedUI();  
    showSection("postsSection");
    fetchPosts();
  } else {
    // If NOT logged in, show the home page
    showSection("homeSection");
  }
});

// Selects all HTML elements that have the attribute data-role (delete btn etc..)
function applyRoleBasedUI() {
  if (!currentUserRole) return;
  document.querySelectorAll("[data-role]").forEach(el => {
    const roles = el.dataset.role.split(" ");
    el.hidden = !roles.includes(currentUserRole); // If the current user's role is not included in the element's allowed roles, it sets that ele hidden
  });
}

/************************************************
  Navigation Events with Loading States
************************************************/
navHome.addEventListener("click", () => {
  showSection("homeSection");
});

console.log("🔍 navRegister:", navRegister);
console.log("🔍 navLogin:   ", navLogin);

// User registration click
console.log("➤ Attaching register listener");
navRegister.addEventListener("click", (e) => {
  console.log("🖱️ navRegister clicked – target:", e.target);
  showSection("registerSection");
});

// Login click
console.log("➤ Attaching login listener");
navLogin.addEventListener("click", (e) => {
  console.log("🖱️ navLogin clicked – target:", e.target);
  showSection("loginSection");
});

// Create post click
navCreatePost.addEventListener("click", () => {
  console.log("🛠️ Create Article NAV button clicked!");
  showSection("createPostSection");
});

// Blog posts click
navPosts.addEventListener("click", () => {
  console.log("🛠️ Articles button clicked!");
  showSection("postsSection");
  fetchPosts();
});

navProfile.addEventListener("click", async() => {
  showSection("profileSection");
  await checkUserStatus();
  await fetchProfileInfo();
  fetchProfileForEdit();
  loadUserPosts();
  loadSavedPosts();
});

signUpLink.addEventListener("click", (e) => {
  e.preventDefault();
  hideAllSections();
  showSection("registerSection");
});

signInLink.addEventListener("click", (e) => {
  e.preventDefault();
  hideAllSections();
  showSection("loginSection");
});

/************************************************
  Check User Authentication Status
************************************************/
// Decides what section to show (login, reg) or logout, blogpost, profile
async function checkUserStatus() {
  console.log("checkUserStatus() called");
  try {
    const response = await fetch("/me", {
      method: "GET",
      credentials: "include",
    });

    console.log("checkUserStatus() /me response:", response.status);

    if (!response.ok) {
      throw new Error("Not authenticated");
    }
    
    const data = await response.json();
    console.log("✅ Logged in as:", data);

    currentUserId   = data.id;
    currentUserRole = data.role;
    console.log("✅ Current User:", currentUserId, "role=", currentUserRole);
    
    // Hide "Register" and "Login"
    navRegister.classList.add("hidden");
    navLogin.classList.add("hidden");

    // Show "Logout", "Articles", "Create Post"
    navLogout.classList.remove("hidden");
    navPosts.classList.remove("hidden");
    navCreatePost.classList.remove("hidden");
    navProfile.classList.remove("hidden");
    
    // Admin-only link
    if (currentUserRole === "admin") {
      navManageUsers.classList.remove("hidden");
    } else {
      navManageUsers.classList.add("hidden");
    }

    return true; // ✅ user is logged in
  } catch (error) {
    console.log("Not authenticated:", error.message);

    // Show "Register", "Login"
    navRegister.classList.remove("hidden");
    navLogin.classList.remove("hidden");

    // Hide "Logout", "Articles", "Create Post"
    navLogout.classList.add("hidden");
    navPosts.classList.add("hidden");
    navCreatePost.classList.add("hidden");
    navProfile.classList.add("hidden");
    navManageUsers.classList.add("hidden"); 

    return false; // ❌ user not logged in
  }
}

/************************************************
  Logout with Loading State
************************************************/
navLogout.addEventListener("click", async () => {
  // Add loading state
  navLogout.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging out...';
  navLogout.style.pointerEvents = 'none';
  
  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const errData = await response.json();
      return;
    }

    // Refresh your user‐status UI logic
    await checkUserStatus();

    // Also clear any hidden attribute on the <li> wrappers
    document.getElementById("navLogin").parentElement.hidden = false;
    document.getElementById("navRegister").parentElement.hidden = false;

    // Manually re‐toggle the classes
    navRegister.classList.remove("hidden");
    navLogin.classList.remove("hidden");

    navLogout.classList.add("hidden");
    navPosts.classList.add("hidden");
    navCreatePost.classList.add("hidden");
    navProfile.classList.add("hidden");
    
    // Reset the global so no one can accidentally write into the old user's bucket
    currentUserId = null;
    navManageUsers.classList.add("hidden");

    // Send them back to Home
    hideAllSections();
    showSection("homeSection");
    
  } catch (error) {
    showMessage("navMessage", "error", "Error during logout");
  } finally {
    // Reset logout button
    navLogout.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Logout';
    navLogout.style.pointerEvents = 'auto';
  }
});


// Real-time input validation for register form, editprofile and changepassword form 
function validateField(field) {
  const value = field.value.trim();
  const fieldId = field.id;
  
  field.classList.remove("is-valid", "is-invalid");
  
  if (fieldId === "regUsername" || fieldId === "newUsername") {
    if (value.length >= 3 && /^[a-zA-Z_-]+$/.test(value)) {
      field.classList.add("is-valid");
    } else if (value.length > 0) {
      field.classList.add("is-invalid");
    }
  } else if (fieldId === "regEmail" || fieldId === "newEmail") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      field.classList.add("is-valid");
    } else if (value.length > 0) {
      field.classList.add("is-invalid");
    }
  } else if (fieldId === "regPassword" || fieldId ==="newPassword") {
    if (value.length >= 6) {
      field.classList.add("is-valid");
    } else if (value.length > 0) {
      field.classList.add("is-invalid");
    }
  }
  //input validation for name in edit profile tab
    else if (fieldId === "newName") {
    if (value.length >= 2 && /^[a-zA-Z ]+$/.test(value)) {
      field.classList.add("is-valid");
    } else if (value.length > 0) {
      field.classList.add("is-invalid");
    }
  }
  // input validation for password in change password tab
    else if (fieldId === "confirmPassword") {
    const newPwdValue = document.getElementById("newPassword").value.trim();
    if (value === newPwdValue && value.length >= 6) {
      field.classList.add("is-valid");
    } else if (value.length > 0) {
      field.classList.add("is-invalid");
    }
  }
    
}

/************************************************
  Register form with input Validation
************************************************/

document.getElementById("regUsername").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z0-9._-]/g, "");  //to stop the user to use the invalid input format
  validateField(this);
});

document.getElementById("regEmail").addEventListener("input", function() {
  validateField(this);
});

document.getElementById("regPassword").addEventListener("input", function() {
  validateField(this);
});


registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Add loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
  submitBtn.disabled = true;
  
  const username = document.getElementById("regUsername");
  const password = document.getElementById("regPassword");
  const email = document.getElementById("regEmail");


  // Trigger re-validation during submission
  validateField(username);
  validateField(email);
  validateField(password);

  // Stop if any field is invalid
  if (
    !username.classList.contains("is-valid") ||
    !email.classList.contains("is-valid") ||
    !password.classList.contains("is-valid")
  ) {
    showMessage("registerMessage", "error", "Please fix the highlighted fields.");
    return;
  }

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ 
        username: username.value.trim(),
        email: email.value.trim(),
        password: password.value.trim(),
      }),
    });

    const data = await response.json();
    console.log("Server response:", data);
    
    if (!response.ok) {
      showMessage("registerMessage", "error", data.detail || data.message);
    } else {
      showMessage("registerMessage", "success", data.message);
      registerForm.reset();
      
      // Clear validation classes
      registerForm.querySelectorAll('.form-control').forEach(field => {
        field.classList.remove("is-valid", "is-invalid");
      });
      
      // Redirect to login section after successful registration
      setTimeout(() => {
        showSection("loginSection");
        showMessage("loginMessage", "success", "Registration successful! Please log in to continue.");
      }, 1500);
    }
  } catch (error) {
    showMessage("registerMessage", "error", "Network error – please try again");
  } finally {
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

/************************************************
  Login form with Enhanced UX
************************************************/
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Add loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';
  submitBtn.disabled = true;

  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });

  try {
    const response = await fetch("/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();
    console.log("Login response:", response.status, data);
    
    if (response.ok) {
      showMessage("loginMessage", "success", data.message);

      // Update UI for logged-in user
      await checkUserStatus();
      applyRoleBasedUI();    

      // Hide all sections and show posts
      hideAllSections(); 
      showSection("postsSection"); 
      fetchPosts(); 

    } else {
      showMessage("loginMessage", "error", data.detail || data.message);
    }
  } catch (error) {
    showMessage("loginMessage", "error", "Network error – please try again");
  } finally {
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

/************************************************
  Create Post with Enhanced UX
************************************************/
createPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("🛠️ Create Article button clicked!");
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Add loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Publishing...';
  submitBtn.disabled = true;

  const title = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();
  const category = document.getElementById("postCategory").value.trim();

  if (!title || !content) {
    showMessage("createPostMessage", "error", "⚠️ Title and content cannot be empty!");
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    return;
  }

  console.log("📌 Sending request to create article with:", { title, content, category});

  try {
    const response = await fetch("/blog_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, content, category}),
    });

    const data = await response.json();
    console.log("🛠️ Create Article Response:", response.status, data);

    if (response.ok) {
      showMessage("createPostMessage", "success", "✅ Article published successfully!");
      document.getElementById("postTitle").value = "";
      document.getElementById("postContent").value = "";
      document.getElementById("postCategory").value = "general";

      // Refresh posts section
      fetchPosts();
      
      // Auto-redirect to posts after 2 seconds
      setTimeout(() => {
        showSection("postsSection");
      }, 2000);
    } else {
      showMessage("createPostMessage", "error", data.detail || "❌ Error creating article");
    }
  } catch (error) {
    showMessage("createPostMessage", "error", "❌ Error creating article: " + error.message);
  } finally {
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

/************************************************
  Fetch Blog Posts with Enhanced Grid
************************************************/
async function fetchPosts() {
  console.log("🛠️ Fetching articles...");

  // Helper to truncate text
  function getTruncatedContent(fullText, limit = 20) {
    const words = fullText.split(" ");
    if (words.length <= limit) {
      return { shortText: fullText, isTruncated: false };
    }
    const truncated = words.slice(0, limit).join(" ") + "...";
    return { shortText: truncated, isTruncated: true };
  }

  try {
    // Check if user is logged in
    const userResponse = await fetch("/me", { credentials: "include" });
    if (!userResponse.ok) {
      throw new Error("⚠️ Failed to get user info. Please log in again.");
    }
    const userData = await userResponse.json();
    const {id: currentUserId, role: currentUserRole } = userData;

    // Fetch all blog posts from server
    const response = await fetch("/blog_posts", {
      method: "GET",
      credentials: "include",
    });
    
    if (!response.ok) {
      const errData = await response.json();
      return showMessage("postsMessage", "error", errData.detail || "Error fetching articles");
    }
    
    const posts = await response.json();
    
    // Sort posts by date (most recent first)
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    blogPosts = posts;

    console.log("📜 Fetched Articles:", posts);

    // Clear existing grid
    const grid = document.getElementById("postsGrid");
    if (!grid) {
      console.error("❌ #postsGrid not found in DOM!");
      return;
    }
    grid.innerHTML = "";
    document.getElementById("postsMessage").innerHTML = "";

    let hasVisiblePosts = false;

    posts.forEach((post, i) => {
      // Skip user's own posts, if not admin
      if (post.user_id === currentUserId && currentUserRole === "user") {
        return;
      }
      hasVisiblePosts = true;

      // Fallback for title/content, Handle missing data safely
      const postTitle = (post.title && post.title !== "undefined") ? post.title : "Untitled Article";
      const postContent = (post.content && post.content !== "undefined") ? post.content : "No content provided";
      const username = (post.username && post.username !== "undefined") ? post.username : "Unknown Author";
      const postCategory = (post.category && post.category !== "undefined") ? post.category : "general";

      // Truncate content
      const { shortText, isTruncated } = getTruncatedContent(postContent, 20); 

      // Condition to enable delete button
      const canDelete =
        currentUserRole === "admin" ||
        (currentUserRole === "user" && post.user_id === currentUserId);

      // Create a blog card
      const card = document.createElement("div");
      card.classList.add("blog-card");
      card.style.position = "relative";

      // Convert the ISO string to a JS Date, then format
      const createdAt = new Date(post.created_at);
      const formattedDate = createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }); 

      // Insert HTML with professional styling
      card.innerHTML = `
        <div class="card-header">      
          <span class="username" data-user-id="${post.user_id}">
            <i class="fas fa-user-circle me-1"></i>@${username}
          </span>
          <span class="post-date">
            <i class="fas fa-calendar-alt me-1"></i>${formattedDate}
          </span>
        </div>
      
        <h3 class="post-title">
          ${postTitle}
          <span class="post-category-small">
            <i class="fas fa-tag me-1"></i>${postCategory}
          </span>
        </h3>
        <p class="post-content">${shortText}</p>
        ${
          isTruncated
            ? `<a href="#" class="read-more" data-post-index="${i}">
                <i class="fas fa-book-open me-1"></i>Read more
               </a>`
            : ""
        }

        <!-- Action buttons in bottom-right corner -->
        <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-top: 15px;">
          ${
            canDelete
              ? `<button class="btn btn-sm btn-danger delete-btn" 
                          data-id="${post._id}"
                          title="Delete article">
                    <i class="bi bi-trash"></i>
                </button>`
              : ""
          }
          <i class="bi ${isPostSaved(post._id) ? 'bi-bookmark-fill saved' : 'bi-bookmark'} bookmark-icon"
            data-id="${post._id}"
            data-title="${postTitle}"
            data-content="${postContent}"
            data-username="${username}"
            title="${isPostSaved(post._id) ? 'Remove from saved articles' : 'Save this article'}"
            style="cursor: pointer;">
          </i>
        </div>
      `;

      // Append to the grid
      grid.appendChild(card);
    });
    
    // Attach delete button listeners AFTER all cards are created
    attachDeleteButtonListeners();

    // Attach bookmark icon listeners
    document.querySelectorAll(".bookmark-icon").forEach(icon => {
      icon.addEventListener("click", function() {
        const postId = this.dataset.id;
        const postTitle = this.dataset.title;
        const postContent = this.dataset.content;
        const userName = this.dataset.username;

        const key = getSavedKey();
        let savedPosts = JSON.parse(localStorage.getItem(key)) || [];

        // Check if already saved
        const alreadySavedIndex = savedPosts.findIndex(sp => sp.id === postId);
        
        if (alreadySavedIndex !== -1) {
          // Post is saved, so unsave it
          savedPosts.splice(alreadySavedIndex, 1);
          localStorage.setItem(key, JSON.stringify(savedPosts));
          
          // Update visual state
          updateBookmarkIcon(this, false);
          
          showMessage("postsMessage", "success", "✅ Article removed from saved articles");
          
        } else {
          // Post is not saved, so save it
          savedPosts.push({ 
            id: postId, 
            title: postTitle, 
            content: postContent, 
            username: userName
          });
          localStorage.setItem(key, JSON.stringify(savedPosts));
          
          // Update visual state
          updateBookmarkIcon(this, true);
          
          showMessage("postsMessage", "success", "✅ Article saved successfully");
        }

        // Refresh saved posts if we're currently viewing that tab
        const savedPostsPanel = document.getElementById("savedPostsPanel");
        if (savedPostsPanel && !savedPostsPanel.classList.contains("hidden")) {
          loadSavedPosts();
        }
      });
    });

    // Read more functionality with enhanced modal
    document.getElementById("postsGrid").addEventListener("click", (e) => {
      if (!e.target.classList.contains("read-more")) return;
      e.preventDefault();

      const idx = Number(e.target.dataset.postIndex);
      const post = blogPosts[idx];
      if (!post) return;

      // Fill in the modal with enhanced content
      document.getElementById("postModalLabel").innerHTML = `
        <i class="fas fa-book-open me-2"></i>${post.title}
      `;
      document.getElementById("postModalBody").textContent = post.content;
      document.getElementById("postModalMeta").innerHTML = `
        <i class="fas fa-user-circle me-1"></i>@${post.username} • 
        <i class="fas fa-calendar-alt me-1"></i>${new Date(post.created_at).toLocaleDateString()} • 
        <i class="fas fa-tag me-1"></i>${post.category || 'General'}
      `;

      // Show modal
      new bootstrap.Modal(document.getElementById("postModal")).show();
    });

    // If no posts were visible, show a message
    if (!hasVisiblePosts) {
      grid.innerHTML = `
        <div class="no-posts-message">
          <i class="fas fa-newspaper fa-2x mb-2"></i>
          <p>No articles available at the moment.</p>
          <small>Be the first to share your insights!</small>
        </div>
      `;
    }

    // Enhanced search/filter logic
    const searchBar = document.getElementById("blogSearchBar");
    if (searchBar) {
      // Remove any existing listeners
      const newSearchBar = searchBar.cloneNode(true);
      searchBar.parentNode.replaceChild(newSearchBar, searchBar);
      
      newSearchBar.addEventListener("input", function () {
        const query = this.value.toLowerCase().trim();

        document.querySelectorAll(".blog-card").forEach((card) => {
          const titleEl = card.querySelector(".post-title");
          const contentEl = card.querySelector(".post-content");
          const categoryEl = card.querySelector(".post-category-small");
          const usernameEl = card.querySelector(".username");

          const titleText = titleEl ? titleEl.textContent.toLowerCase() : "";
          const contentText = contentEl ? contentEl.textContent.toLowerCase() : "";
          const categoryText = categoryEl ? categoryEl.textContent.toLowerCase() : "";
          const usernameText = usernameEl ? usernameEl.textContent.toLowerCase() : "";

          const matchesSearch = titleText.includes(query) || 
                              contentText.includes(query) ||
                              categoryText.includes(query) ||
                              usernameText.includes(query);

          if (matchesSearch || query === "") {
            card.style.display = "block";
          } else {
            card.style.display = "none";
          }
        });
      });
    }

  } catch (error) {
    console.error("fetchPosts error:", error);
    showMessage("postsMessage", "error", "❌ Unable to load articles: " + (error.message || error));
  }
}

/************************************************
  Delete Post Functions with Confirmation
************************************************/
function attachDeleteButtonListeners() {
  console.log("🛠️ Attaching delete button listeners...");
  
  // Remove any existing listeners to prevent duplicates
  document.querySelectorAll(".delete-btn").forEach((button) => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
  });
  
  // Attach fresh listeners
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.stopPropagation();
      const postId = e.currentTarget.dataset.id;
      console.log("🗑️ Delete button clicked for article:", postId);
      
      if (!postId) {
        console.error("❌ No article ID found on delete button!");
        return;
      }
      
      await deletePost(postId);
    });
  });
}

// Delete for ADMIN only
async function deletePost(id) {
  console.log("🗑️ deletePost called with id:", id);
  
  if (!id || id === "undefined") {
    console.error("❌ Invalid article ID:", id);
    showMessage("postsMessage", "error", "❌ Invalid article ID");
    return;
  }

  showDeleteConfirmModal(async () => {

    try {
      const response = await fetch(`/blog_posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("Delete response:", response.status);

      if (response.ok) {
        showMessage("postsMessage", "success", "✅ Article deleted successfully!");
        // Refresh the posts grid
        await fetchPosts();
      } else {
        const errorData = await response.json();
        console.error("Delete error:", errorData);
        showMessage("postsMessage", "error", errorData.detail || "❌ Error deleting article");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showMessage("postsMessage", "error", "❌ Error deleting article: " + error.message);
    }
  });
}

// function to show confirmation model 
function showDeleteConfirmModal(onConfirm) {
  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.remove("hidden");

  const closeModal = () => modal.classList.add("hidden");

  const yesBtn = document.getElementById("confirmDeleteYes");
  const noBtn = document.getElementById("confirmDeleteNo");

  const handleClick = (e) => {
    if (e.target === yesBtn) onConfirm();
    closeModal();
    yesBtn.removeEventListener("click", handleClick);
    noBtn.removeEventListener("click", handleClick);
  };

  yesBtn.addEventListener("click", handleClick);
  noBtn.addEventListener("click", handleClick);
}


// Delete from profile section
async function deletePostFromProfile(id) {
  console.log("🗑️ deletePostFromProfile called with id:", id);
  
  if (!id || id === "undefined") {
    console.error("❌ Invalid article ID:", id);
    showMessage("userPostsMessage", "error", "❌ Invalid article ID");
    return;
  }

  showDeleteConfirmModal(async () => {

    try {
      const response = await fetch(`/blog_posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("Profile delete response:", response.status);

      if (response.ok) {
        showMessage("userPostsMessage", "success", "✅ Article deleted successfully!");
        // Refresh user posts in profile
        await loadUserPosts();
        // Also refresh main posts if needed
        await fetchPosts();
      } else {
        const errorData = await response.json();
        console.error("Profile delete error:", errorData);
        showMessage("userPostsMessage", "error", errorData.detail || "❌ Error deleting article");
      }
    } catch (error) {
      console.error("Profile delete error:", error);
      showMessage("userPostsMessage", "error", "❌ Error deleting article: " + error.message);
    }
  });
}

/************************************************
  Edit & Delete Posts
************************************************/
function editPost(id, title, content) {
  // 1. Prefill the modal form fields with current post data
  document.getElementById("editPostId").value = id;
  document.getElementById("editPostTitle").value = title;
  document.getElementById("editPostContent").value = content;
  console.log("details of post loaded");
  // 2. Show the Bootstrap modal
  const modal = new bootstrap.Modal(document.getElementById("editPostModal"));
  modal.show();
}

document.getElementById("editPostForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("editPostId").value;
  const newTitle = document.getElementById("editPostTitle").value;
  const newContent = document.getElementById("editPostContent").value;

  const formData = new FormData();
  formData.append("title", newTitle);
  formData.append("content", newContent);

  try {
    const response = await fetch(`/blog_posts/${id}`, {
      method: "PUT",
      credentials: "include",
      body: formData,
    });

    if (response.ok) {
      showMessage("userPostsMessage","success", "✅ Post updated Successfully!");  
      bootstrap.Modal.getInstance(document.getElementById("editPostModal")).hide(); // Hide modal after clicking update
      fetchPosts();
      loadUserPosts();
    } else {
      const errorData = await response.json();
      showMessage(
        "userPostsMessage",
        "error",
        errorData.detail || "❌ Error updating post"
      );
    }
  } catch (error) {
    showMessage(
      "userPostsMessage",
      "error",
      "❌ Network error — could not update profile: " + error.message
    );
  }
});

/************************************************
  Saved Posts Management
************************************************/
function getSavedKey() {
  if (!currentUserId) {
    console.error("🚨 getSavedKey(): no currentUserId!");
    throw new Error("You must be logged in to save articles");
  }
  const key = `savedPosts_${currentUserId}`;
  console.log("🔑 getSavedKey() →", key);
  return key;
}

// Function to check if post is already saved
function isPostSaved(postId) {
  try {
    const key = getSavedKey();
    const savedPosts = JSON.parse(localStorage.getItem(key)) || [];
    return savedPosts.some(sp => sp.id === postId);
  } catch (error) {
    return false;
  }
}

// Function to update bookmark visual state
function updateBookmarkIcon(icon, isSaved) {
  if (isSaved) {
    icon.classList.add('saved');
    icon.classList.remove('bi-bookmark');
    icon.classList.add('bi-bookmark-fill');
    icon.setAttribute('title', 'Remove from saved articles');
  } else {
    icon.classList.remove('saved');
    icon.classList.remove('bi-bookmark-fill');
    icon.classList.add('bi-bookmark');
    icon.setAttribute('title', 'Save this article');
  }
}

// Load saved posts with enhanced UI
function loadSavedPosts() {
  const savedPostsGrid = document.getElementById("savedPostsGrid");
  if (!savedPostsGrid) return;

  savedPostsGrid.innerHTML = "";

  try {
    const key = getSavedKey();
    const savedPosts = JSON.parse(localStorage.getItem(key)) || [];
    
    console.log("Loading saved articles for user:", currentUserId);
    console.log("Found articles:", savedPosts);

    if (savedPosts.length === 0) {
      savedPostsGrid.innerHTML = `
        <div class="no-posts-message">
          <i class="fas fa-bookmark fa-2x mb-2"></i>
          <p>No saved articles yet.</p>
          <small>Save articles you want to read later!</small>
        </div>
      `;
      return;
    }
    
    // Helper to truncate text
    function getTruncatedContent(fullText, limit = 15) {
      const words = fullText.split(" ");
      if (words.length <= limit) {
        return { shortText: fullText, isTruncated: false };
      }
      const truncated = words.slice(0, limit).join(" ") + "...";
      return { shortText: truncated, isTruncated: true };
    }

    // Build a card for each saved post
    savedPosts.forEach((post, index) => {
      const postTitle = (post.title && post.title !== "undefined") ? post.title : "Untitled Article";
      const postContent = (post.content && post.content !== "undefined") ? post.content : "No content provided";
      const username = (post.username && post.username !== "undefined") ? post.username : "Unknown Author";
    
      const { shortText, isTruncated } = getTruncatedContent(postContent, 15);

      const card = document.createElement("div");
      card.classList.add("blog-card");

      card.innerHTML = `
        <div class="card-header">
          <span class="username">
            <i class="fas fa-user-circle me-1"></i>@${username}
          </span>
        </div>
        <h3 class="post-title">
          <i class="fas fa-bookmark me-1"></i>${postTitle}
        </h3>
        <p class="post-content">${shortText}</p>
        ${
          isTruncated
            ? `<a href="#" class="read-more">
                <i class="fas fa-book-open me-1"></i>Read more
               </a>`
            : ""
        }
        <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
          <button 
            class="btn btn-sm btn-danger unsave-btn" 
            data-index="${index}"
            title="Remove from saved articles"
          >
            <i class="fas fa-trash me-1"></i>Remove
          </button>
        </div>
      `;

      savedPostsGrid.appendChild(card);

      // Read more logic
      if (isTruncated) {
        const readMoreLink = card.querySelector(".read-more");
        let isExpanded = false;

        readMoreLink.addEventListener("click", (e) => {
          e.preventDefault();
          isExpanded = !isExpanded;

          const contentEl = card.querySelector(".post-content");
          if (isExpanded) {
            contentEl.textContent = postContent;
            readMoreLink.innerHTML = '<i class="fas fa-eye-slash me-1"></i>Show less';
          } else {
            contentEl.textContent = shortText;
            readMoreLink.innerHTML = '<i class="fas fa-book-open me-1"></i>Read more';
          }
        });
      }
    });

    // Attach Unsave logic after creating all cards
    document.querySelectorAll(".unsave-btn").forEach(button => {
      button.addEventListener("click", function() {
        const index = parseInt(this.dataset.index, 10); 
        removeSavedPost(index);
      });
    });

  } catch (error) {
    console.error("Error loading saved posts:", error);
    savedPostsGrid.innerHTML = `
      <div class="no-posts-message">
        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
        <p>Error loading saved articles.</p>
      </div>
    `;
  }
}

// Remove posts from saved with confirmation
function removeSavedPost(index) {
  
  try {
    const key = getSavedKey();
    let savedPosts = JSON.parse(localStorage.getItem(key)) || [];
    
    if (index >= 0 && index < savedPosts.length) {
      const removedPost = savedPosts[index];
      
      // Remove the post at this index
      savedPosts.splice(index, 1);
      localStorage.setItem(key, JSON.stringify(savedPosts));
      
      // Update the main posts bookmark icons if they exist
      const mainBookmarkIcon = document.querySelector(`#postsGrid .bookmark-icon[data-id="${removedPost.id}"]`);
      if (mainBookmarkIcon) {
        updateBookmarkIcon(mainBookmarkIcon, false);
      }
      
      // Re-load the saved posts to reflect changes
      loadSavedPosts();
      
      showMessage("postsMessage", "success", "✅ Article removed from saved articles");
    }
  } catch (error) {
    console.error("Error removing saved post:", error);
    showMessage("postsMessage", "error", "❌ Error removing saved article");
  }
}

/************************************************
  User Posts Management
************************************************/
async function loadUserPosts() {
  try {
    const response = await fetch("/profile", {
      method: "GET",
      credentials: "include"
    });
    
    if (!response.ok) {
      const errData = await response.json();
      return showMessage("userPostsMessage", "error", errData.detail || "Error fetching profile for user articles");
    }

    const data = await response.json();
    console.log("Profile data (for user posts):", data);

    const userPostsList = document.getElementById("userPostsList");
    if (!userPostsList) {
      console.error("No #userPostsList element found!");
      return;
    }
    userPostsList.innerHTML = "";

    if (!data.posts || data.posts.length === 0) {
      userPostsList.innerHTML = `
        <li class='list-group-item text-center'>
          <i class="fas fa-pen fa-2x mb-2 text-muted"></i>
          <p>No articles published yet.</p>
          <small class="text-muted">Start sharing your thoughts and ideas!</small>
        </li>
      `;
      return;
    }

    // Helper to truncate text
    function getTruncatedContent(fullText, limit = 12) {
      const words = fullText.split(" ");
      if (words.length <= limit) {
        return { shortText: fullText, isTruncated: false };
      }
      const truncated = words.slice(0, limit).join(" ") + "...";
      return { shortText: truncated, isTruncated: true };
    }

    // Render each user post
    data.posts.forEach((post) => {
      const postTitle = post.title ? post.title : "Untitled Article";
      const postContent = post.content ? post.content : "No content provided";

      // Encoded for safe passing in data attributes
      const encodedTitle = encodeURIComponent(postTitle);
      const encodedContent = encodeURIComponent(postContent);

      const { shortText, isTruncated } = getTruncatedContent(postContent, 12);

      const listItem = document.createElement("li");
      listItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-start");

      listItem.innerHTML = `
        <div class="flex-grow-1">
          <strong class="mb-1 d-block">
            <i class="fas fa-newspaper me-2"></i>${postTitle}
          </strong>
          <p class="post-text mb-1">${shortText}</p>
          ${
            isTruncated
              ? `<a href="#" class="read-more" style="color:rgb(99, 57, 172);">
                  <i class="fas fa-book-open me-1"></i>Read more
                 </a>`
              : ""
          }
          <small class="text-muted">
            <i class="fas fa-calendar-alt me-1"></i>
            ${new Date(post.created_at).toLocaleDateString()}
          </small>
        </div>
        <div>
          <button 
            class="btn btn-sm btn-secondary edit-btn me-2" 
            data-id="${post.id}"
            data-title="${encodedTitle}"
            data-content="${encodedContent}"
            title="Edit article"
          >
            <i class="bi bi-pencil-square"></i>
          </button>
          <button 
            class="btn btn-sm btn-danger delete-btn" 
            data-id="${post.id}"
            title="Delete article"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;

      userPostsList.appendChild(listItem);

      // Read more toggle logic
      if (isTruncated) {
        const readMoreLink = listItem.querySelector(".read-more");
        readMoreLink.addEventListener("click", (e) => {
          e.preventDefault();
          const postText = listItem.querySelector(".post-text");
          const isExpanded = readMoreLink.textContent.includes("Show less");

          if (isExpanded) {
            postText.textContent = shortText;
            readMoreLink.innerHTML = '<i class="fas fa-book-open me-1"></i>Read more';
          } else {
            postText.textContent = postContent;
            readMoreLink.innerHTML = '<i class="fas fa-eye-slash me-1"></i>Show less';
          }
        });
      }
    });

    // Attach Edit/Delete button listeners
    attachPostButtonListeners();
    
  } catch (error) {
    console.error("Error loading user posts:", error);
    showMessage("userPostsMessage", "error", "❌ Error loading your articles: " + (error.message || error));
  }
}

// Attach event listeners for post buttons
function attachPostButtonListeners() {
  console.log("🛠️ Attaching event listeners for Edit and Delete buttons in profile...");

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const postId = e.target.dataset.id;
      const title = decodeURIComponent(e.target.dataset.title);
      const content = decodeURIComponent(e.target.dataset.content);
      editPost(postId, title, content);
    });
  });

  // For profile section delete buttons
  document.querySelectorAll("#userPostsList .delete-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.stopPropagation();
      const postId = e.currentTarget.dataset.id;
      console.log("🗑️ Profile delete button clicked for article:", postId);
      await deletePostFromProfile(postId);
    });
  });
}

/************************************************
  Profile Management
************************************************/
async function fetchProfileInfo() {
  try {
    const response = await fetch("/profile", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errData = await response.json();
      return showMessage(
        "profileMessage",
        "error",
        errData.detail || "Error fetching profile"
      );
    }

    const data = await response.json();
    console.log("Profile data:", data);
    
    document.getElementById("profileName").textContent = data.name || "No name set";

    if (data.photo_url) {
      document.getElementById("profilePic").src = data.photo_url;
    }

    const profileInfo = document.getElementById("profileInfo");
    profileInfo.innerHTML = `
      <p><strong><i class="fas fa-at me-1"></i>Username:</strong> ${data.username}</p>
      <p><strong><i class="fas fa-newspaper me-1"></i>Total Posts:</strong> ${data.total_posts}</p>
      <hr>
    `;
  

  } catch (error) {
    showMessage(
      "profileMessage",
      "error",
      "Error fetching profile info: " + error.message
    );
  }
}
/************************************************
  Profile Photo Management
************************************************/
// Camera icon and menu management
const cameraIcon = document.getElementById("cameraIcon");
const uploadProfilePic = document.getElementById("uploadProfilePic");
const cameraMenu = document.getElementById("cameraMenu");
const choosePhoto = document.getElementById("choosePhoto");
const removePhoto = document.getElementById("removePhoto");
const profilePic = document.getElementById("profilePic");

// Toggle dropdown on camera icon click
if (cameraIcon && cameraMenu) {
  cameraIcon.addEventListener("click", () => {
    console.log("✅ cameraIcon was clicked!");
    cameraMenu.classList.toggle("show");
  });
  
  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!cameraIcon.contains(e.target) && !cameraMenu.contains(e.target)) {
      cameraMenu.classList.remove("show");
    }
  });
}

// "Choose from system" triggers file input
if (choosePhoto && uploadProfilePic) {
  choosePhoto.addEventListener("click", () => {
    cameraMenu.classList.remove("show");
    uploadProfilePic.click();
  });
}

// File upload handling
if (uploadProfilePic) {
  uploadProfilePic.addEventListener("change", async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage("profileMessage", "error", "Please select a valid image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("profileMessage", "error", "Image size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Show loading state
      profilePic.style.opacity = "0.5";
      cameraIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      const response = await fetch("/upload_profile_photo", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        return showMessage("profileMessage", "error", errData.detail || "Error uploading photo");
      }

      const data = await response.json();
      profilePic.src = data.photo_url;
      showMessage("profileMessage", "success", "✅ Profile photo updated successfully!");
      
    } catch (error) {
      console.error("Upload error:", error);
      showMessage("profileMessage", "error", "Error uploading photo: " + error.message);
    } finally {
      // Reset loading state
      profilePic.style.opacity = "1";
      cameraIcon.innerHTML = '<i class="fas fa-camera"></i>';
    }
  });
}

// Remove photo functionality
if (removePhoto) {
  removePhoto.addEventListener("click", async () => {
    cameraMenu.classList.remove("show");

    if (!confirm("Remove your profile photo?")) return;

    try {
      const response = await fetch("/remove_profile_photo", {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        const errData = await response.json();
        return showMessage("profileMessage", "error", errData.detail || "Error removing photo");
      }

      profilePic.src = "/static/user_photos/default-profile.png";
      showMessage("profileMessage", "success", "✅ Profile photo removed successfully!");

    } catch (err) {
      console.error(err);
      showMessage("profileMessage", "error", "Error removing photo: " + err.message);
    }
  });
}

/************************************************
  Profile Tabs Management
************************************************/
const tabButtons = document.querySelectorAll(".profile-tabs .tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

// Initialize tabs
tabButtons.forEach(b => b.classList.remove("active"));
tabPanels.forEach(p => p.classList.add("hidden"));

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const panel = document.getElementById(targetId);
    const isOpen = btn.classList.contains("active");

    // If already open, close it
    if (isOpen) {
      btn.classList.remove("active");
      panel.classList.add("hidden");
      return;
    }
    
    // Otherwise, close everything and open this one
    tabButtons.forEach(b => b.classList.remove("active"));
    tabPanels.forEach(p => p.classList.add("hidden"));
    
    btn.classList.add("active");
    panel.classList.remove("hidden");
    
    // Load content for this tab
    if (targetId === "yourPostsPanel") {
      loadUserPosts();
    } else if (targetId === "savedPostsPanel") {
      loadSavedPosts();
    } else if (targetId === "editProfilePanel") {
      fetchProfileForEdit();
    }
  });
});

/************************************************
  Edit Profile Form
************************************************/
async function fetchProfileForEdit() {
  try {
    const res = await fetch("/profile", {
      method: "GET",
      credentials: "include"
    });
    
    if (!res.ok) {
      const err = await res.json();
      return showMessage("editProfileMessage", "error", err.detail || "Error fetching profile details");
    }
    
    const data = await res.json();
    
    // Helper to apply fetched style
    function applyFetched(inputId, value) {
      const input = document.getElementById(inputId);
      if (!input || !value) return;
      input.value = value;
      input.classList.add("fetched-value");
      // On first user edit, remove the faded style
      input.addEventListener("input", () => {
        input.classList.remove("fetched-value");
      }, { once: true });
    }

    applyFetched("newName", data.name);
    applyFetched("newUsername", data.username);
    applyFetched("newEmail", data.email);

  } catch (err) {
    console.error("fetchProfileForEdit:", err);
    showMessage("editProfileMessage", "error", "Error fetching profile: " + err.message);
  }
}

// Attach real-time validation
document.getElementById("newName").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z ]/g, "");
  validateField(this);
});

document.getElementById("newUsername").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z0-9._-]/g, "");
  validateField(this);
});

document.getElementById("newEmail").addEventListener("input", function () {
  validateField(this);
});



// Save profile changes
const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    const originalText = saveProfileBtn.innerHTML;
    saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    saveProfileBtn.disabled = true;

    // Grab & trim values
    const nameEl = document.getElementById("newName");
    const userEl = document.getElementById("newUsername");
    const emailEl = document.getElementById("newEmail");
    const newName = nameEl ? nameEl.value.trim() : "";
    const newUsername = userEl ? userEl.value.trim() : "";
    const newEmail = emailEl ? emailEl.value.trim() : "";

    validateField(nameEl);
    validateField(userEl);
    validateField(emailEl);

    if (
      (!nameEl.classList.contains("is-valid")) ||
      (!userEl.classList.contains("is-valid")) ||
      (!emailEl.classList.contains("is-valid"))
    ) {
      showMessage("editProfileMessage", "error", "Please fix the highlighted fields before saving.");
      saveProfileBtn.innerHTML = originalText;
      saveProfileBtn.disabled = false;
      return;
    }


    // Build FormData with only non-empty fields
    const fd = new FormData();
    if (newName) fd.append("new_name", newName);
    if (newUsername) fd.append("new_username", newUsername);
    if (newEmail) fd.append("new_email", newEmail);

    try {
      const res = await fetch("/edit_profile", {
        method: "PUT",
        credentials: "include",
        body: fd
      });

      const result = await res.json();

      if (!res.ok) {
        return showMessage("editProfileMessage", "error", result.detail || "Error editing profile");
      }

      showMessage("editProfileMessage", "success", result.message || "✅ Profile updated successfully!");
      
      // Close the Edit Profile panel
      setTimeout(() => {
        const editBtn = document.querySelector('.tab-button[data-target="editProfilePanel"]');
        const editPanel = document.getElementById('editProfilePanel');
        if (editBtn && editPanel) {
          editBtn.classList.remove('active');
          editPanel.classList.add('hidden');
        }
      }, 3000);

      // Refresh profile info
      await fetchProfileInfo();
      await fetchProfileForEdit();

    } catch (err) {
      console.error("Error editing profile:", err);
      showMessage("editProfileMessage", "error", "Error editing profile: " + err.message);
    } finally {
      saveProfileBtn.innerHTML = originalText;
      saveProfileBtn.disabled = false;
    }
  });
}

/************************************************
  Change Password Form
************************************************/
const savePasswordBtn = document.getElementById("savePasswordBtn");
const changePasswordForm = document.getElementById("changePasswordForm");

//for styling the fields during validation 
document.getElementById("newPassword").addEventListener("input", function () {
  validateField(this);
});

document.getElementById("confirmPassword").addEventListener("input", function () {
  validateField(this);
});

if (savePasswordBtn && changePasswordForm) {
  savePasswordBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const originalText = savePasswordBtn.innerHTML;
    savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...';
    savePasswordBtn.disabled = true;

    const oldPwd = document.getElementById("oldPassword")?.value.trim() || "";  // "" is fallback if ele is missing or ele is null
    const newPwd = document.getElementById("newPassword")?.value.trim() || "";
    const confirmPwd = document.getElementById("confirmPassword")?.value.trim() || "";
    // As validation needs this ele from form
    const newPasswordInput = document.getElementById("newPassword"); 
    const confirmPasswordInput = document.getElementById("confirmPassword"); 

    // Basic validation
    if (!oldPwd || !newPwd || !confirmPwd) {
      showMessage("changePasswordMessage", "error", "Please fill out all fields");
      savePasswordBtn.innerHTML = originalText;
      savePasswordBtn.disabled = false;
      return;
    }

    //validation using validateInput()
    validateField(newPasswordInput);
    validateField(confirmPasswordInput);

    if ( 
      !newPasswordInput.classList.contains("is-valid") ||
      !confirmPasswordInput.classList.contains("is-valid") 
    ) {
      showMessage("changePasswordMessage", "error", "Please fix the highlighted fields before saving.");
      savePasswordBtn.innerHTML = originalText;
      savePasswordBtn.disabled = false;
      return;
    }

    // Build the payload
    const fd = new FormData();
    fd.append("current_password", oldPwd);
    fd.append("new_password", newPwd);

    try {
      const res = await fetch("/change_password", {
        method: "PUT",
        credentials: "include",
        body: fd
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Error changing password");
      }

      // Success
      showMessage("changePasswordMessage", "success", data.message || "✅ Password updated successfully!");

      // Clear form
      changePasswordForm.reset();

      /*Collapse the Change Password tab
      const btn = document.querySelector('.tab-button[data-target="changePasswordPanel"]');
      const panel = document.getElementById("changePasswordPanel");
      if (btn && panel) {
        btn.classList.remove("active");
        panel.classList.add("hidden");
      }  */
      
    } catch (err) {
      console.error("Change password failed:", err);
      showMessage("changePasswordMessage", "error", "❌ " + err.message);
    } finally {
      savePasswordBtn.innerHTML = originalText;
      savePasswordBtn.disabled = false;
    }
  });
}

/************************************************
  Admin Functions
************************************************/
console.log("navManageUsers element is:", navManageUsers);
if (navManageUsers) {
  navManageUsers.addEventListener("click", () => {
    console.log("🖱️ Manage Users clicked");
    hideAllSections();
    showSection("adminUsersSection");
    App.admin.loadUsers();
  });
} else {
  console.warn("⚠️ navManageUsers not found in DOM!");
}

// Admin: Manage Users logic
App.admin.loadUsers = async () => {
  console.log("📥 Admin user loader called!");
  try {
    const res = await fetch('/admin/users', { credentials: 'include' });
    const users = await res.json();
    const tbody = document.querySelector('#adminUsersSection #adminUsersTable tbody');
    
    if (!tbody) {
      console.error("Admin users table body not found!");
      return;
    }
    
    tbody.innerHTML = '';
    
    users.forEach(u => {
      console.log("Rendering user:", u.username);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>
          <span class="username-cell" data-id="${u.id}">
            ${u.username}
          </span>
        </td>
        <td>
          ${u.email || 'N/A'}
        </td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">
            <i class="fas fa-${u.role === 'admin' ? 'crown' : 'user'} me-1"></i>${u.role}
          </span>
        </td>
        <td>
          ${u.role === 'user'
            ? `<button data-action="promote" data-id="${u.id}" title="Promote to Admin">
                <i class="fas fa-arrow-up me-1"></i>Promote
               </button>`
            : `<button data-action="demote" data-id="${u.id}" title="Demote to User">
                <i class="fas fa-arrow-down me-1"></i>Demote
               </button>`
          }
          <button data-action="delete-user" data-id="${u.id}" title="Delete User">
            <i class="fas fa-trash me-1"></i>Delete
          </button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
    showMessage("adminMessage", "error", "Failed to load users: " + e.message);
  }
};

App.admin.filterUsers = () => {
  const term = document.getElementById('userSearchInput').value.toLowerCase();
  document.querySelectorAll('#adminUsersTable tbody tr').forEach(tr => {
    const txt = tr.innerText.toLowerCase();
    tr.hidden = !txt.includes(term);
  });
};

App.admin.openUserModal = async (userId) => {
  try {
    const res = await fetch(`/admin/users/${userId}`, { credentials: 'include' });
    const u = await res.json();
    document.getElementById('modalUsername').innerHTML = `
      <i class="fas fa-user-circle me-2"></i>${u.username}
    `;
    document.getElementById('modalEmail').innerText = u.email || '—';
    document.getElementById('modalPostCount').innerText = u.total_posts;
    document.getElementById('userDetailModal').classList.remove('hidden');
  } catch (e) {
    console.error(e);
    showMessage("adminMessage", "error", "Failed to load user details: " + e.message);
  }
};

App.admin.closeUserModal = () => {
  document.getElementById('userDetailModal').classList.add('hidden');
};

App.admin.handleUserActions = async (evt) => {
  const btn = evt.target;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!action) return;

  try {
    let res;
    switch(action) {
      case 'promote':
        if (!confirm(`Promote this user to admin?`)) return;
        res = await fetch(`/admin/users/${id}/promote`, {
          method: 'PUT', credentials: 'include'
        });
        break;
      case 'demote':
        if (!confirm(`Demote this admin to user?`)) return;
        res = await fetch(`/admin/users/${id}/demote`, {
          method: 'PUT', credentials: 'include'
        });
        break;
      case 'delete-user':
        if (!confirm(`⚠️ Delete this user permanently?\n\nThis action cannot be undone.`)) return;
        res = await fetch(`/admin/users/${id}`, {
          method: 'DELETE', credentials: 'include'
        });
        break;
    }
    
    if (!res.ok){
      const err = await res.text();
      return showMessage("adminMessage", "error", "Action failed: " + err);
    }
    
    showMessage("adminMessage", "success", "✅ Action completed successfully");
    // Reload the table after change
    App.admin.loadUsers();
  } catch (e) {
    console.error(e);
    showMessage("adminMessage", "error", "Action failed: " + e.message);
  }
};

// Delegate clicks for promote/delete and username clicks
document.addEventListener('click', (evt) => {
  if (evt.target.matches('button[data-action]')) {
    App.admin.handleUserActions(evt);
  } else if (evt.target.matches('.username-cell')) {
    App.admin.openUserModal(evt.target.dataset.id);
  }
});

/************************************************
  Common Filter Function
************************************************/
// Add filter posts function
App.common.filterPosts = function() {
  const searchBar = document.getElementById("blogSearchBar");
  if (!searchBar) return;
  
  const query = searchBar.value.toLowerCase().trim();
  
  document.querySelectorAll(".blog-card").forEach((card) => {
    const titleEl = card.querySelector(".post-title");
    const contentEl = card.querySelector(".post-content");
    const categoryEl = card.querySelector(".post-category-small");
    const usernameEl = card.querySelector(".username");
    
    const titleText = titleEl ? titleEl.textContent.toLowerCase() : "";
    const contentText = contentEl ? contentEl.textContent.toLowerCase() : "";
    const categoryText = categoryEl ? categoryEl.textContent.toLowerCase() : "";
    const usernameText = usernameEl ? usernameEl.textContent.toLowerCase() : "";
    
    const matchesSearch = titleText.includes(query) || 
                        contentText.includes(query) ||
                        categoryText.includes(query) ||
                        usernameText.includes(query);
    
    if (matchesSearch || query === "") {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
};

/************************************************
  Helper Function for Truncated Content
************************************************/
// Helper Function to truncate text
function getTruncatedContent(fullText, limit = 10) {
  const words = fullText.split(" ");
  if (words.length <= limit) {
    return { shortText: fullText, isTruncated: false };
  }
  const truncated = words.slice(0, limit).join(" ") + "...";
  return { shortText: truncated, isTruncated: true };
}

/************************************************
  Enhanced Error Handling
************************************************/
// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default handling (which would log to console)
  event.preventDefault();
});

// Global error handler for JavaScript errors
window.addEventListener('error', event => {
  console.error('JavaScript error:', event.error);
});

/************************************************
  Performance Optimization
************************************************/
// Debounce function for search inputs
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Apply debounce to search functions
const debouncedSearch = debounce(App.common.filterPosts, 300);

/************************************************
  Accessibility Enhancements
************************************************/
// Keyboard navigation for modals
document.addEventListener('keydown', (e) => {
  // Close modals with Escape key
  if (e.key === 'Escape') {
    // Close Bootstrap modals
    const openModals = document.querySelectorAll('.modal.show');
    openModals.forEach(modal => {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) modalInstance.hide();
    });
    
    // Close admin modal
    const adminModal = document.getElementById('userDetailModal');
    if (adminModal && !adminModal.classList.contains('hidden')) {
      App.admin.closeUserModal();
    }
    
    // Close camera menu
    const cameraMenu = document.getElementById('cameraMenu');
    if (cameraMenu && cameraMenu.classList.contains('show')) {
      cameraMenu.classList.remove('show');
    }
  }
});

/************************************************
  Local Storage Management
************************************************/
// Function to clean up old localStorage data
function cleanupLocalStorage() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('savedPosts_')) {
        const data = JSON.parse(localStorage.getItem(key));
        // Remove empty or corrupted entries
        if (!Array.isArray(data)) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Error cleaning up localStorage:', error);
  }
}

// Run cleanup on page load
document.addEventListener('DOMContentLoaded', () => {
  cleanupLocalStorage();
});

/************************************************
  Network Status Handling
************************************************/
// Handle online/offline status
window.addEventListener('online', () => {
  console.log('✅ Back online');
  // Optionally refresh data when coming back online
  if (currentUserId) {
    fetchPosts();
  }
});

window.addEventListener('offline', () => {
  console.log('❌ Gone offline');
  showMessage('postsMessage', 'error', '❌ You are currently offline. Some features may not work.');
});

/************************************************
  Loading States and UI Feedback
************************************************/
// Show loading spinner for long operations
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
        <p class="mt-2 text-muted">Loading...</p>
      </div>
    `;
  }
}

function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
}

/************************************************
  Form Enhancement
************************************************/
// Auto-resize textareas
document.addEventListener('input', (e) => {
  if (e.target.tagName === 'TEXTAREA') {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }
});

// Character counter for content fields
const postContentField = document.getElementById('postContent');
if (postContentField) {
  const maxLength = 5000; // Set a reasonable limit
  
  // Create character counter
  const counter = document.createElement('small');
  counter.className = 'text-muted mt-1';
  counter.style.display = 'block';
  postContentField.parentNode.appendChild(counter);
  
  postContentField.addEventListener('input', function() {
    const remaining = maxLength - this.value.length;
    counter.textContent = `${this.value.length}/${maxLength} characters`;
    
    if (remaining < 100) {
      counter.className = 'text-warning mt-1';
    } else if (remaining < 0) {
      counter.className = 'text-danger mt-1';
    } else {
      counter.className = 'text-muted mt-1';
    }
  });
}

/************************************************
  Animation and UI Polish
************************************************/
// Add smooth transitions to section changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
      if (target.classList.contains('section-container') || target.classList.contains('auth-section')) {
        if (!target.classList.contains('hidden')) {
          // Add entrance animation
          target.style.opacity = '0';
          target.style.transform = 'translateY(20px)';
          
          setTimeout(() => {
            target.style.transition = 'all 0.5s ease-out';
            target.style.opacity = '1';
            target.style.transform = 'translateY(0)';
          }, 10);
        }
      }
    }
  });
});

// Start observing
document.querySelectorAll('.section-container, .auth-section').forEach(section => {
  observer.observe(section, { attributes: true });
});

/************************************************
  Final Initialization
************************************************/
console.log("🎉 BlogSpace main.js fully loaded and initialized!");

// Log current environment info
console.log(`📊 Environment Info:
- User Agent: ${navigator.userAgent}
- Screen: ${screen.width}x${screen.height}
- Viewport: ${window.innerWidth}x${window.innerHeight}
- Online: ${navigator.onLine}
- Local Storage Available: ${typeof Storage !== 'undefined'}
`);

// Set up global app state
window.BlogSpace = {
  version: '2.0.0',
  currentUserId,
  currentUserRole,
  features: {
    profilePhotos: true,
    savedPosts: true,
    adminPanel: true,
    realTimeValidation: true
  }
};

console.log("✨ BlogSpace application ready!");