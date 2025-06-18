console.log("✅ main.js is successfully loaded!");

// Organizes admin functions in a scoped object
const App = {
  admin: {}
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

// Sections
const registerSection = document.getElementById("registerSection");
const loginSection = document.getElementById("loginSection");
const postsSection = document.getElementById("postsSection");
const createPostSection = document.getElementById("createPostSection");

// Forms
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const createPostForm = document.getElementById("createPostForm");

// Output
const postsList = document.getElementById("postsGrid");

/**
 * Display messages in containers
 * @param {string} containerId – the ID of the <div> you just added
 * @param {"success"|"error"} type – which CSS class to use
 * @param {string} text – the message body
 */
function showMessage(containerId, type, text) {
  const container = document.getElementById(containerId);
  if (!container) return console.warn("No container for", containerId);
  
  container.innerHTML = `<p class="${type}-message">${text}</p>`;
  
  // auto-dismiss
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

/**
 * Toast notification for specific actions (create/delete posts)
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info, warning)
 */
function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) return;
  
  const toastId = 'toast-' + Date.now();
  
  const iconMap = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };
  
  const bgMap = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-primary'
  };
  
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast align-items-center text-white ${bgMap[type]} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center">
        <i class="bi ${iconMap[type]} me-2"></i>
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
  bsToast.show();
  
  // Remove from DOM after hiding
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

/************************************************
  Hide/Show Sections
************************************************/
function hideAllSections() {
  console.log("hideAllSections() called");
  document.querySelectorAll(".section-container, .auth-section").forEach((el) => { 
    console.log("Hiding section:", el.id);
    el.classList.add("hidden"); 
    el.style.display = "none";
  });
}

function showSection(sectionId) {
  console.log(`showSection(${sectionId}) called`);
  hideAllSections();

  const target = document.getElementById(sectionId);
  if (target) {
    console.log(`Showing section: ${sectionId}`);
    target.classList.remove("hidden");

    if (["adminUsersSection"].includes(sectionId)) {
      target.style.display = "block";
    } else {
      target.style.display = "flex";
    }
  } else {
    console.warn(`No section found with id=${sectionId}`);
  }
}

//On page load(display sections)
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

function applyRoleBasedUI() {
  if (!currentUserRole) return;
  document.querySelectorAll("[data-role]").forEach(el => {
    const roles = el.dataset.role.split(" ");
    el.hidden = !roles.includes(currentUserRole);
  });
}

/************************************************
  Navigation Events
************************************************/
navHome.addEventListener("click", () => {
  showSection("homeSection");
});

console.log("🔍 navRegister:", navRegister);
console.log("🔍 navLogin:   ", navLogin);

console.log("➤ Attaching register listener");
navRegister.addEventListener("click", (e) => {
  console.log("🖱️ navRegister clicked – target:", e.target);
  showSection("registerSection");
});

console.log("➤ Attaching login listener");
navLogin.addEventListener("click", (e) => {
  console.log("🖱️ navLogin clicked – target:", e.target);
  showSection("loginSection");
});

navCreatePost.addEventListener("click", () => {
  console.log("🛠️ Create Post NAV button clicked!");
  showSection("createPostSection");
});

navPosts.addEventListener("click", () => {
  console.log("🛠️ Blog Posts button clicked!");
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

    // Show "Logout", "Blog Posts", "Create Post"
    navLogout.classList.remove("hidden");
    navPosts.classList.remove("hidden");
    navCreatePost.classList.remove("hidden");
    navProfile.classList.remove("hidden");
    
    //  Admin-only link
    if (currentUserRole === "admin") {
      navManageUsers.classList.remove("hidden");
    } else {
      navManageUsers.classList.add("hidden");
    }

    return true;
  } catch (error) {
    console.log("Not authenticated:", error.message);

    // Show "Register", "Login"
    navRegister.classList.remove("hidden");
    navLogin.classList.remove("hidden");

    // Hide "Logout", "Blog Posts", "Create Post"
    navLogout.classList.add("hidden");
    navPosts.classList.add("hidden");
    navCreatePost.classList.add("hidden");
    navProfile.classList.add("hidden");
    navManageUsers.classList.add("hidden"); 

    return false;
  }
}

/************************************************
  Logout click
************************************************/
navLogout.addEventListener("click", async () => {
  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const errData = await response.json();
      return;
    }

    await checkUserStatus();

    document.getElementById("navLogin").parentElement.hidden    = false;
    document.getElementById("navRegister").parentElement.hidden = false;

    navRegister.classList.remove("hidden");
    navLogin    .classList.remove("hidden");

    navLogout      .classList.add("hidden");
    navPosts       .classList.add("hidden");
    navCreatePost  .classList.add("hidden");
    navProfile     .classList.add("hidden");
    
    currentUserId = null;
    navManageUsers .classList.add("hidden");

    hideAllSections();
    showSection("homeSection");
  } catch (error) {
    alert("Error during logout");
  }
});

/************************************************
  Register form for user
************************************************/
document.getElementById("regUsername").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z_-]/g, "");
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUsername").value;
  const password = document.getElementById("regPassword").value;
  const email = document.getElementById("regEmail").value;

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email, password}),
    });

    const data = await response.json();
    console.log("Server response:", data);
    if (!response.ok) {
      showMessage("registerMessage", "error", data.detail || data.message);
    } else {
      showMessage("registerMessage", "success", data.message);
      registerForm.reset();
    }
  } catch (error) {
    showMessage("registerMessage", "error", "Network error – please try again");
  }
});

/************************************************
  Loginform User
************************************************/
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

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

      await checkUserStatus();
      applyRoleBasedUI();    

      hideAllSections(); 
      showSection("postsSection"); 
      fetchPosts(); 

    } else {
      showMessage("loginMessage", "error", data.detail || data.message);
    }
  } catch (error) {
    showMessage("loginMessage", "error", "Network error – please try again");
  }
});

/************************************************
  Create Post (Form Submit)
************************************************/
createPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("🛠️ Create Post button clicked!");

  const title = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();
  const category = document.getElementById("postCategory").value.trim();

  if (!title || !content) {
    showMessage("createPostMessage", "error", "⚠️ Title and content cannot be empty!");
    return;
  }

  console.log("📌 Sending request to create post with:", { title, content, category});

  try {
    const response = await fetch("/blog_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, content, category}),
    });

    const data = await response.json();
    console.log("🛠️ Create Post Response:", response.status, data);

    if (response.ok) {
      showMessage("createPostMessage", "success", "✅ Post created successfully!");
      showToast("Post created successfully! 🎉", "success"); // Toast for post creation
      document.getElementById("postTitle").value = "";
      document.getElementById("postContent").value = "";

      fetchPosts();
    } else {
      showMessage("createPostMessage", "error", data.detail || "❌ Error creating post");
    }
  } catch (error) {
    showMessage("createPostMessage", "error", "❌ Error creating post: " + error.message);
  }
});

/************************************************
  Attach Edit/Delete Buttons to Posts
************************************************/
function attachPostButtonListeners() {
  console.log("🛠️ Attaching event listeners for Edit and Delete buttons...");

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const postId = e.currentTarget.dataset.id;
      const title = decodeURIComponent(e.currentTarget.dataset.title);
      const content = decodeURIComponent(e.currentTarget.dataset.content);
      editPost(postId, title, content);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const postId = e.currentTarget.dataset.id;
      console.log("postId",postId)
      deletePost(postId);
    });
  });
}

/************************************************
  Fetch Blog Posts
************************************************/
async function fetchPosts() {
  console.log("🛠️ Fetching blog posts...");

  function getTruncatedContent(fullText, limit = 15) {
    const words = fullText.split(" ");
    if (words.length <= limit) {
      return { shortText: fullText, isTruncated: false };
    }
    const truncated = words.slice(0, limit).join(" ") + "...";
    return { shortText: truncated, isTruncated: true };
  }

  try {
    const userResponse = await fetch("/me", { credentials: "include" });
    if (!userResponse.ok) {
      throw new Error("⚠️ Failed to get user info. Please log in again.");
    }
    const userData = await userResponse.json();
    const {id: currentUserId, role: currentUserRole } = userData;

    const response = await fetch("/blog_posts", {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      const errData = await response.json();
      return showMessage("postsMessage", "error", errData.detail || "Error fetching posts");
    }
    const posts = await response.json();
    // Sort posts by date (most recent first)
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    blogPosts = posts;

    console.log("📜 Fetched Posts:", posts);

    const grid = document.getElementById("postsGrid");
    if (!grid) {
      console.error("❌ #postsGrid not found in DOM!");
      return;
    }
    grid.innerHTML = "";
    document.getElementById("postsMessage").innerHTML = "";

    let hasVisiblePosts = false;

    posts.forEach((post, i) => {
      if (post.user_id === currentUserId && currentUserRole === "user") {
        return;
      }
      hasVisiblePosts = true;

      const postTitle = (post.title && post.title !== "undefined") ? post.title : "Untitled";
      const postContent = (post.content && post.content !== "undefined") ? post.content : "No content provided";
      const username = (post.username && post.username !== "undefined") ? post.username : "Unknown User";
      const postCategory = (post.category && post.category !== "undefined") ? post.category : "general";

      const { shortText, isTruncated } = getTruncatedContent(postContent, 15); 
      //checks for admin access to show delete for all posts
      const canDelete =
        currentUserRole === "admin" ||
        (currentUserRole === "user" && post.user_id === currentUserId);

      const card = document.createElement("div");
      card.classList.add("blog-card");
      card.style.position = "relative";

      const createdAt = new Date(post.created_at);
      const formattedDate = createdAt.toLocaleDateString(); 

      card.innerHTML = `
        <div class="card-header">      
          <span class="username" data-user-id="${post.user_id}">@${username}</span>
          <span class="post-date"> ${formattedDate}</span>
        </div>
      
        <h3 class="post-title">${postTitle}<span class="post-category-small">(${postCategory})</span>
        </h3>
        <p class="post-content">${shortText}</p>
        ${
          isTruncated
            ? `<a href="#" class="read-more" data-post-index="${i}">Read more</a>`
            : ""
        }

        <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center; margin-top: 10px;">
          ${
            canDelete
              ? `<button class="btn btn-sm btn-danger delete-btn" 
                          data-id="${post._id}">
                    <i class="bi bi-trash"></i>
                </button>`
              : ""
          }
          <i class="bi bi-bookmark bookmark-icon"
            data-id="${post._id}"
            data-title="${postTitle}"
            data-content="${postContent}"
            data-username="${username}"
            style="cursor: pointer;">
          </i>
        </div>
      `;

      grid.appendChild(card);
      attachPostButtonListeners();
    });
    
    // Event listners for save Icons
    document.querySelectorAll(".bookmark-icon").forEach(icon => {
      icon.addEventListener("click", function() {
        const postId = this.dataset.id;
        const postTitle = this.dataset.title;
        const postContent = this.dataset.content;
        const userName = this.dataset.username;

        const key = getSavedKey();
        let savedPosts = JSON.parse(localStorage.getItem(key)) || [];

        const alreadySaved = savedPosts.some(sp => sp.id === postId);
        if (alreadySaved) {
          return showMessage("postsMessage", "error", "This Post is already saved!");
        }

        savedPosts.push({ 
          id: postId, 
          title: postTitle, 
          content: postContent, 
          username: userName
        });
        localStorage.setItem(key, JSON.stringify(savedPosts));

        showMessage("postsMessage", "success", "✅ Post saved successfully");
        loadSavedPosts();
      });
    });

    document
      .getElementById("postsGrid")
      .addEventListener("click", (e) => {
        if (!e.target.classList.contains("read-more")) return;
        e.preventDefault();

        const idx = Number(e.target.dataset.postIndex);
        const post = blogPosts[idx];
        if (!post) return;

        document.getElementById("postModalLabel").textContent = post.title;
        document.getElementById("postModalBody").textContent = post.content;
        document.getElementById("postModalMeta").textContent = [
          `@${post.username}`,
          new Date(post.created_at).toLocaleDateString(),
          post.category ? `(${post.category})` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        new bootstrap.Modal(
          document.getElementById("postModal")
        ).show();
      })

    if (!hasVisiblePosts) {
      grid.innerHTML = '<p style="color: red; font-weight: bold;">No blog posts available.</p>';
    }

    // Search bar 
    const searchBar = document.getElementById("blogSearchBar");
    if (searchBar) {
      searchBar.addEventListener("keyup", function () {
        const query = this.value.toLowerCase();

        document.querySelectorAll(".blog-card").forEach((card) => {
          const titleEl = card.querySelector(".post-title");
          const catEl = card.querySelector(".post-category");
          const userEl = card.querySelector(".username");

          const titleText = titleEl ? titleEl.textContent.toLowerCase() : "";
          const catText = catEl ? catEl.textContent.toLowerCase() : "";
          const userText = userEl ? userEl.textContent.toLowerCase() : "";

          if (titleText.includes(query)||catText.includes(query)||userText.includes(query)) {
            card.style.display = "block";
          } else {
            card.style.display = "none";
          }
        });
      });
    }

  } catch (error) {
    console.error("fetchPosts error:", error);
    showMessage(
      "postsMessage",
        "error",
        "❌ Unable to load posts: " + (error.message || error)
      );
  }
}

/************************************************
  Edit & Delete Posts
************************************************/
function editPost(id, title, content) {
  // 1. Prefill the modal form fields with current post data
  document.getElementById("editPostId").value = id;
  document.getElementById("editPostTitle").value = title;
  document.getElementById("editPostContent").value = content;

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

async function deletePost(id) {
  try {
    const response = await fetch(`/blog_posts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      showMessage(
        "userPostsMessage",
        "success",
        "✅ Blog post deleted successfully!"
      );
      showToast("Post deleted successfully! 🗑️", "success"); // Toast for post deletion
      loadUserPosts();
      fetchPosts();
    
    } else {
      const errorData = await response.json();
      showMessage(
        "userPostsMessage",
        "error",
        errorData.detail || "❌ Error deleting post"
      );
    }
  } catch (error) {
    showMessage(
      "userPostsMessage",
      "error",
      "❌ Error deleting post: " + error.message
    );
  }
}

function getSavedKey() {
  if (!currentUserId) {
    console.error("🚨 getSavedKey(): no currentUserId!");
    throw new Error("You must be logged in to save posts");
  }
  const key = `savedPosts_${currentUserId}`;
  console.log("🔑 getSavedKey() →", key);
  return key;
}

function loadSavedPosts() {
  const savedPostsGrid = document.getElementById("savedPostsGrid");
  if (!savedPostsGrid) return;

  savedPostsGrid.innerHTML = "";

  const key = getSavedKey();
  const savedPosts = JSON.parse(localStorage.getItem(key)) || []
  
  console.log("Loading saved posts for user:", currentUserId);
  console.log("Found this array:", savedPosts);

  if (savedPosts.length === 0) {
    savedPostsGrid.innerHTML = '<p class="no-posts-message">No posts are saved.</p>';
    return;
  }
  
  function getTruncatedContent(fullText, limit = 15) {
    const words = fullText.split(" ");
    if (words.length <= limit) {
      return { shortText: fullText, isTruncated: false };
    }
    const truncated = words.slice(0, limit).join(" ") + "...";
    return { shortText: truncated, isTruncated: true };
  }

  savedPosts.forEach((post, index) => {
    const postTitle = (post.title && post.title !== "undefined") ? post.title : "Untitled";
    const postContent = (post.content && post.content !== "undefined") ? post.content : "No content provided";
    const username = (post.username && post.username !== "undefined") ? post.username : "Unknown User";
  
    const { shortText, isTruncated } = getTruncatedContent(postContent, 15);

    const card = document.createElement("div");
    card.classList.add("blog-card");

    card.innerHTML = `
      <span class="username">@${username}</span>
      <h3 class="post-title">${postTitle}</h3>
      <p class="post-content">${shortText}</p>
      ${
        isTruncated
          ? `<a href="#" class="read-more">Read more</a>`
          : ""
      }
      <button 
        class="btn btn-sm btn-danger unsave-btn" 
        data-index="${index}"
      >
        Unsave
      </button>
    `;

    savedPostsGrid.appendChild(card);

    if (isTruncated) {
      const readMoreLink = card.querySelector(".read-more");
      let isExpanded = false;

      readMoreLink.addEventListener("click", (e) => {
        e.preventDefault();
        isExpanded = !isExpanded;

        const contentEl = card.querySelector(".post-content");
        if (isExpanded) {
          contentEl.textContent = postContent;
          readMoreLink.textContent = "Show less";
        } else {
          contentEl.textContent = shortText;
          readMoreLink.textContent = "Read more";
        }
      });
    }
  });

 document.querySelectorAll(".unsave-btn").forEach(button => {
  button.addEventListener("click", function() {
    const index = parseInt(this.dataset.index, 10); 
    removeSavedPost(index);
  });
});
}

function removeSavedPost(index) {
  const key = getSavedKey();
  let savedPosts = JSON.parse(localStorage.getItem(key)) || [];
  if (index >= 0 && index < savedPosts.length) {
    savedPosts.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(savedPosts));
    loadSavedPosts();
  }
}

function getTruncatedContent(fullText, limit = 10) {
  const words = fullText.split(" ");
  if (words.length <= limit) {
    return { shortText: fullText, isTruncated: false };
  }
  const truncated = words.slice(0, limit).join(" ") + "...";
  return { shortText: truncated, isTruncated: true };
}


async function loadUserPosts() {
  try {
    const response = await fetch("/profile", {
      method: "GET",
      credentials: "include"
    });
    if (!response.ok) {
      const errData = await response.json();
      return showMessage(
        "userPostsMessage",
        "error",
        errData.detail || "Error fetching profile for user posts"
      );
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
      userPostsList.innerHTML = "<li class='list-group-item'>No posts yet.</li>";
      return;
    }

    function getTruncatedContent(fullText, limit = 10) {
      const words = fullText.split(" ");
      if (words.length <= limit) {
        return { shortText: fullText, isTruncated: false };
      }
      const truncated = words.slice(0, limit).join(" ") + "...";
      return { shortText: truncated, isTruncated: true };
    }

    data.posts.forEach((post) => {
      console.log("post",post)
      const postTitle = post.title ? post.title : "Untitled";
      const postContent = post.content ? post.content : "No content provided";

      const encodedTitle = encodeURIComponent(postTitle);
      const encodedContent = encodeURIComponent(postContent);

      const { shortText, isTruncated } = getTruncatedContent(postContent, 10);

      const listItem = document.createElement("li");
      listItem.classList.add(
        "list-group-item", 
        "d-flex", 
        "justify-content-between", 
        "align-items-start"
      );

      listItem.innerHTML = `
        <div class="flex-grow-1">
          <strong class="mb-1 d-block">${postTitle}</strong>
          <p class="post-text mb-1">${shortText}</p>
          ${
            isTruncated
              ? `<a href="#" class="read-more" style="color: #1565c0;">Read more</a>`
              : ""
          }
        </div>
        <div>
          <button 
            class="btn btn-sm btn-secondary edit-btn" 
            data-id="${post.id}"
            data-title="${encodedTitle}"
            data-content="${encodedContent}"
          >
            <i class="bi bi-pencil-square"></i>
          </button>
          <button 
            class="btn btn-sm btn-danger delete-btn" 
            data-id="${post.id}"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;

      userPostsList.appendChild(listItem);

      if (isTruncated) {
        const readMoreLink = listItem.querySelector(".read-more");
        readMoreLink.addEventListener("click", (e) => {
          e.preventDefault();
          const postText = listItem.querySelector(".post-text");
          const isExpanded = readMoreLink.textContent === "Show less";

          if (isExpanded) {
            postText.textContent = shortText;
            readMoreLink.textContent = "Read more";
          } else {
            postText.textContent = postContent;
            readMoreLink.textContent = "Show less";
          }
        });
      }
    });

    attachPostButtonListeners();
    
  } catch (error) {
    console.error("Error loading user posts:", error);
    showMessage(
      "userPostsMessage",
      "error",
      "❌ Error loading your posts: " + (error.message || error)
    );
  }
}

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
      <p><strong>Username:</strong> ${data.username}</p>
      <p><strong>Total Posts:</strong> ${data.total_posts}</p>
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

// Camera functionality
const cameraIcon = document.getElementById("cameraIcon");
const uploadProfilePic = document.getElementById("uploadProfilePic");
const cameraMenu = document.getElementById("cameraMenu");
const choosePhoto = document.getElementById("choosePhoto");
const removePhoto = document.getElementById("removePhoto");
const profilePic = document.getElementById("profilePic");

if (cameraIcon && cameraMenu) {
  cameraIcon.addEventListener("click", () => {
    console.log("✅ cameraIcon was clicked!");
    cameraMenu.classList.toggle("show");
  });
}

if (choosePhoto && uploadProfilePic) {
  choosePhoto.addEventListener("click", () => {
    cameraMenu.classList.remove("show")
    uploadProfilePic.click();
  });
}

if (uploadProfilePic) {
  uploadProfilePic.addEventListener("change", async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/upload_profile_photo", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        return showMessage(
          "profileMessage",
          "error",
          errData.detail || "Error uploading photo"
        );
      }

      const data = await response.json();
      profilePic.src = data.photo_url;
      showMessage(
        "profileMessage",
        "success",
        "✅ Profile photo updated successfully!"
      );
    } catch (error) {
      console.error("Upload error:", error);
      showMessage(
        "profileMessage",
        "error",
        "Error uploading photo: " + error.message
      );
    }
  });
}

if (removePhoto) {
  removePhoto.addEventListener("click", async () => {
    cameraMenu.classList.add("hidden");

    if (!confirm("Remove your profile photo?")) return;

    try {
      const response = await fetch("/remove_profile_photo", {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        const errData = await response.json();
        return showMessage(
          "profileMessage",
          "error",
          errData.detail || "Error removing photo"
        );
      }

      profilePic.src =  "/static/images/default profile picture.png";

      showMessage(
        "profileMessage",
        "success",
        "✅ Profile photo removed successfully!"
      );

    } catch (err) {
      console.error(err);
      showMessage(
        "profileMessage",
        "error",
        "Error removing photo: " + err.message
      );
    }
  });
}

// Tab behavior
const tabButtons = document.querySelectorAll(".profile-tabs .tab-button");
const tabPanels  = document.querySelectorAll(".tab-panel");

tabButtons.forEach(b => b.classList.remove("active"));
tabPanels.forEach(p => p.classList.add("hidden"));

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const panel   = document.getElementById(targetId);
    const isOpen  = btn.classList.contains("active");

    if (isOpen) {
      btn.classList.remove("active");
      panel.classList.add("hidden");
      return;
    }
    
    tabButtons.forEach(b => b.classList.remove("active"));
    tabPanels.forEach(p => p.classList.add("hidden"));
    
    btn.classList.add("active");
    panel.classList.remove("hidden");
    
    if (targetId === "yourPostsPanel") {
      loadUserPosts();
    } else if (targetId === "savedPostsPanel") {
      loadSavedPosts();
    } else if (targetId === "editProfilePanel") {
      fetchProfileForEdit();
    }
  });
});

// Edit profile functionality
async function fetchProfileForEdit() {
  try {
    const res = await fetch("/profile", {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) {
      const err = await res.json();
      return showMessage(
        "editProfileMessage",
        "error",
        err.detail || "Error fetching profile details"
      );
    }
    const data = await res.json();
    
    function applyFetched(inputId, value) {
      const input = document.getElementById(inputId);
      if (!input || !value) return;
      input.value = value;
      input.classList.add("fetched-value");
      input.addEventListener("input", () => {
        input.classList.remove("fetched-value");
      }, { once: true });
    }

    applyFetched("newName",     data.name);
    applyFetched("newUsername", data.username);
    applyFetched("newEmail",    data.email);

  } catch (err) {
    console.error("fetchProfileForEdit:", err);
     showMessage(
      "editProfileMessage",
      "error",
      "Error fetching profile: " + err.message
    );
  }
}

document.getElementById("newName").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z]/g, "");
});
document.getElementById("newUsername").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z.-_]/g, "");
});

const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    const nameEl     = document.getElementById("newName");
    const userEl     = document.getElementById("newUsername");
    const emailEl    = document.getElementById("newEmail");
    const newName     = nameEl    ? nameEl.value.trim()     : "";
    const newUsername = userEl    ? userEl.value.trim()     : "";
    const newEmail    = emailEl   ? emailEl.value.trim()    : "";

    const fd = new FormData();
    if (newName)     fd.append("new_name",      newName);
    if (newUsername) fd.append("new_username",  newUsername);
    if (newEmail)    fd.append("new_email",     newEmail);

    try {
      const res = await fetch("/edit_profile", {
        method: "PUT",
        credentials: "include",
        body: fd
      });

      const result = await res.json();

      if (!res.ok) {
        return showMessage(
          "editProfileMessage",
          "error",
          result.detail || "Error editing profile"
        );
      }

      showMessage(
        "editProfileMessage",
        "success",
        result.message || "✅ Profile updated successfully!"
      );
      
      setTimeout(() => {
        const editBtn   = document.querySelector('.tab-button[data-target="editProfilePanel"]');
        const editPanel = document.getElementById('editProfilePanel');
        if (editBtn && editPanel) {
          editBtn.classList.remove('active');
          editPanel.classList.add('hidden');
        }
      }, 3000);

      await fetchProfileForEdit();

    } catch (err) {
      console.error("Error editing profile:", err);
      showMessage(
        "editProfileMessage",
        "error",
        "Error editing profile: " + err.message
      );
    }
  });
}

// Change password functionality
;(function(){
  const savePasswordBtn   = document.getElementById("savePasswordBtn");
  const form = document.getElementById("changePasswordForm");
  if (!savePasswordBtn || !form) return;

  savePasswordBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const oldPwd     = document.getElementById("oldPassword")?.value.trim()     || "";
    const newPwd     = document.getElementById("newPassword")?.value.trim()     || "";
    const confirmPwd = document.getElementById("confirmPassword")?.value.trim() || "";

    if (!oldPwd || !newPwd || !confirmPwd) {
      return showMessage("changePasswordMessage", "error", "Please fill out all fields");
    }

    if (newPwd !== confirmPwd) {
      return showMessage(
        "changePasswordMessage",
        "error",
        "❌ New passwords do not match"
      );
    }
    
    // if everything is valid in form inputs, it creates formData 
    const fd = new FormData();
    fd.append("current_password", oldPwd);
    fd.append("new_password",     newPwd);

    try {
      const res  = await fetch("/change_password", {
        method: "PUT",
        credentials: "include",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        throw { 
          status: res.status,
          message: data.detail || "Error changing password"
        };
      }

      showMessage(
        "changePasswordMessage",
        "success",
        data.message || "✅ Password updated successfully!"
      ); 

      /* setTimeout(() => {
        const btn   = document.querySelector('.tab-button[data-target="changePasswordPanel"]');
        const panel = document.getElementById("changePasswordPanel");
        if (btn && panel) {
          btn.classList.remove("active");
          panel.classList.add("hidden");
        }
      }, 3000); */

    } catch (err) {
      console.error("Change password failed:", err);
      showMessage(
        "changePasswordMessage",
        "error",
        `❌ ${err.message}`

      );
    }
  });
})();

// Admin section
console.log("navManageUsers element is:", navManageUsers);
if (navManageUsers) {
  navManageUsers.addEventListener("click", () => {
    console.log("🖱️ Manage Users clicked");
    hideAllSections();
    showSection("adminUsersSection");
    App.admin.loadUsers();
  });
}
else {
  console.warn("⚠️ navManageUsers not found in DOM!");
}

// Admin functions
App.admin.loadUsers = async () => {
  console.log("📥 Admin user loader called!");
  try {
    const res = await fetch('/admin/users', { credentials: 'include' });
    const users = await res.json();
    const tbody = document.querySelector('#adminUsersSection #adminUsersTable tbody');
    tbody.innerHTML = '';
    users.forEach(u => {
      console.log("Rendering user:", u.username);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td><span class="username-cell" data-id="${u.id}">${u.username}</span></td>
        <td>${u.email || ''}</td>
        <td>${u.role}</td>
        <td>
          ${u.role === 'user'
            ? `<button data-action="promote" data-id="${u.id}">Promote</button>`
            : `<button data-action="demote" data-id="${u.id}">Demote</button>`
          }
          <button data-action="delete-user" data-id="${u.id}">Delete</button>
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
    document.getElementById('modalUsername').innerText   = u.username;
    document.getElementById('modalEmail').innerText      = u.email || '—';
    document.getElementById('modalPostCount').innerText  = u.total_posts;
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
  const id     = btn.dataset.id;
  if (!action) return;

  try {
    let res;
    switch(action) {
      case 'promote':
        res = await fetch(`/admin/users/${id}/promote`, {
          method: 'PUT', credentials: 'include'
        });
        break;
      case 'demote':
        res = await fetch(`/admin/users/${id}/demote`, {
          method: 'PUT', credentials: 'include'
        });
        break;
      case 'delete-user':
        res = await fetch(`/admin/users/${id}`, {
          method: 'DELETE', credentials: 'include'
        });
        break;
    }
    if (!res.ok){
      const err = await res.text();
      return showMessage("adminMessage", "error", "Action failed: " + err);
    }
    showMessage("adminMessage", "success", "Action succeeded");
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